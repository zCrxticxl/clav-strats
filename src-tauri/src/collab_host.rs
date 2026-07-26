use futures_util::StreamExt;
use serde::Serialize;
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader, Read},
    net::{IpAddr, SocketAddr},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{mpsc, Arc},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Manager, State};
use tokio::sync::{oneshot, Mutex};
use url::Url;
use warp::{
    ws::{WebSocket, Ws},
    Filter, Rejection, Reply,
};
use yrs::{sync::Awareness, Doc};
use yrs_warp::{
    broadcast::BroadcastGroup,
    ws::{WarpSink, WarpStream},
    AwarenessRef,
};

const CLOUDFLARED_WINDOWS_URL: &str =
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";

type Rooms = Arc<Mutex<HashMap<String, Arc<BroadcastGroup>>>>;

#[derive(Default)]
pub struct CollabHostState {
    runtime: Mutex<Option<HostRuntime>>,
}

struct HostRuntime {
    server_url: String,
    local_port: u16,
    server_shutdown: Option<oneshot::Sender<()>>,
    tunnel_executable: PathBuf,
    tunnel: Child,
}

enum TunnelEvent {
    PublicUrl(String),
    Ready,
}

impl Drop for HostRuntime {
    fn drop(&mut self) {
        if let Some(shutdown) = self.server_shutdown.take() {
            let _ = shutdown.send(());
        }
        let _ = self.tunnel.kill();
        let _ = self.tunnel.wait();
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollabHostInfo {
    server_url: String,
    local_server_url: String,
    local_port: u16,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollabHostStatus {
    running: bool,
    reachable: bool,
    server_url: Option<String>,
    local_server_url: Option<String>,
}

fn host_info(runtime: &HostRuntime) -> CollabHostInfo {
    CollabHostInfo {
        server_url: runtime.server_url.clone(),
        local_server_url: format!("ws://127.0.0.1:{}", runtime.local_port),
        local_port: runtime.local_port,
    }
}

impl CollabHostState {
    async fn start(&self, app: &AppHandle) -> Result<CollabHostInfo, String> {
        let mut runtime = self.runtime.lock().await;
        if let Some(existing) = runtime.as_mut() {
            match existing.tunnel.try_wait() {
                Ok(None) => {
                    return Ok(host_info(existing));
                }
                Ok(Some(_)) | Err(_) => {
                    runtime.take();
                }
            }
        }

        let (local_port, server_shutdown) = start_local_server();
        let mut server_shutdown = Some(server_shutdown);
        let cloudflared = match resolve_cloudflared(app).await {
            Ok(executable) => executable,
            Err(error) => {
                if let Some(shutdown) = server_shutdown.take() {
                    let _ = shutdown.send(());
                }
                return Err(error);
            }
        };
        let (tunnel, public_http_url) = match start_quick_tunnel(&cloudflared, local_port).await {
            Ok(result) => result,
            Err(error) => {
                if let Some(shutdown) = server_shutdown.take() {
                    let _ = shutdown.send(());
                }
                return Err(error);
            }
        };

        let server_url = public_http_url.replacen("https://", "wss://", 1);
        *runtime = Some(HostRuntime {
            server_url: server_url.clone(),
            local_port,
            server_shutdown,
            tunnel_executable: cloudflared,
            tunnel,
        });

        Ok(host_info(
            runtime.as_ref().expect("host runtime was just created"),
        ))
    }

    async fn stop(&self) -> bool {
        self.runtime.lock().await.take().is_some()
    }

    async fn restart_tunnel(&self, app: &AppHandle) -> Result<CollabHostInfo, String> {
        let mut runtime = self.runtime.lock().await;
        let Some(existing) = runtime.as_mut() else {
            drop(runtime);
            return self.start(app).await;
        };

        // A Quick Tunnel can lose its public hostname while the local Yjs server
        // is still healthy. Only replace cloudflared here so every shared Yjs
        // room and document stays alive across tunnel recovery.
        terminate_child(&mut existing.tunnel);
        let (tunnel, public_http_url) =
            start_quick_tunnel(&existing.tunnel_executable, existing.local_port).await?;
        existing.server_url = public_http_url.replacen("https://", "wss://", 1);
        existing.tunnel = tunnel;

        Ok(host_info(existing))
    }

    async fn status(&self) -> CollabHostStatus {
        let (running, server_url, local_server_url) = {
            let mut runtime = self.runtime.lock().await;
            let Some(existing) = runtime.as_mut() else {
                return CollabHostStatus {
                    running: false,
                    reachable: false,
                    server_url: None,
                    local_server_url: None,
                };
            };
            let running = matches!(existing.tunnel.try_wait(), Ok(None));
            (
                running,
                existing.server_url.clone(),
                format!("ws://127.0.0.1:{}", existing.local_port),
            )
        };
        let reachable = running && public_tunnel_reachable(&server_url).await;
        CollabHostStatus {
            running,
            reachable,
            server_url: Some(server_url),
            local_server_url: Some(local_server_url),
        }
    }

    pub fn shutdown_now(&self) {
        if let Ok(mut runtime) = self.runtime.try_lock() {
            runtime.take();
        }
    }
}

#[tauri::command]
pub async fn start_collab_host(
    app: AppHandle,
    state: State<'_, CollabHostState>,
) -> Result<CollabHostInfo, String> {
    state.start(&app).await
}

#[tauri::command]
pub async fn stop_collab_host(state: State<'_, CollabHostState>) -> Result<bool, String> {
    Ok(state.stop().await)
}

#[tauri::command]
pub async fn restart_collab_tunnel(
    app: AppHandle,
    state: State<'_, CollabHostState>,
) -> Result<CollabHostInfo, String> {
    state.restart_tunnel(&app).await
}

#[tauri::command]
pub async fn collab_host_status(
    state: State<'_, CollabHostState>,
) -> Result<CollabHostStatus, String> {
    Ok(state.status().await)
}

fn start_local_server() -> (u16, oneshot::Sender<()>) {
    let rooms: Rooms = Arc::new(Mutex::new(HashMap::new()));
    let health = warp::path("health").and(warp::path::end()).map(|| "ok");
    let websocket = warp::path::param::<String>()
        .and(warp::path::end())
        .and(warp::ws())
        .and(with_rooms(rooms))
        .and_then(websocket_handler);
    let routes = health.or(websocket);
    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let (address, server) =
        warp::serve(routes).bind_with_graceful_shutdown(([127, 0, 0, 1], 0), async move {
            let _ = shutdown_rx.await;
        });
    tauri::async_runtime::spawn(server);
    (address.port(), shutdown_tx)
}

fn with_rooms(
    rooms: Rooms,
) -> impl Filter<Extract = (Rooms,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}

async fn websocket_handler(room: String, ws: Ws, rooms: Rooms) -> Result<impl Reply, Rejection> {
    let group = {
        let mut rooms = rooms.lock().await;
        if let Some(group) = rooms.get(&room) {
            group.clone()
        } else {
            let awareness: AwarenessRef = Arc::new(Awareness::new(Doc::new()));
            let group = Arc::new(BroadcastGroup::new(awareness, 64).await);
            rooms.insert(room, group.clone());
            group
        }
    };
    Ok(ws.on_upgrade(move |socket| websocket_peer(socket, group)))
}

async fn websocket_peer(socket: WebSocket, group: Arc<BroadcastGroup>) {
    let (sink, stream) = socket.split();
    let sink = Arc::new(Mutex::new(WarpSink::from(sink)));
    let stream = WarpStream::from(stream);
    let subscription = group.subscribe(sink, stream);
    let _ = subscription.completed().await;
}

async fn resolve_cloudflared(app: &AppHandle) -> Result<PathBuf, String> {
    let command = PathBuf::from("cloudflared");
    if cloudflared_works(&command) {
        return Ok(command);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        return Err("Automatic Live Collab hosting is currently available on Windows.".into());
    }

    #[cfg(target_os = "windows")]
    {
        let directory = app
            .path()
            .app_local_data_dir()
            .map_err(|error| format!("Cannot access the app data directory: {error}"))?
            .join("tools");
        fs::create_dir_all(&directory)
            .map_err(|error| format!("Cannot create the tools directory: {error}"))?;
        let executable = directory.join("cloudflared.exe");
        if cloudflared_works(&executable) {
            return Ok(executable);
        }

        download_cloudflared(&executable).await?;
        if !cloudflared_works(&executable) {
            return Err("The downloaded Cloudflare Tunnel executable could not be started.".into());
        }
        Ok(executable)
    }
}

fn cloudflared_works(executable: &Path) -> bool {
    let mut command = hidden_command(executable);
    command
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

async fn download_cloudflared(destination: &Path) -> Result<(), String> {
    let response = reqwest::Client::new()
        .get(CLOUDFLARED_WINDOWS_URL)
        .timeout(Duration::from_secs(120))
        .send()
        .await
        .map_err(|error| format!("Cloudflare Tunnel download failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Cloudflare Tunnel download failed with HTTP {}.",
            response.status()
        ));
    }
    if response.content_length().unwrap_or(0) > 200 * 1024 * 1024 {
        return Err("The Cloudflare Tunnel download was unexpectedly large.".into());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Cloudflare Tunnel download could not be read: {error}"))?;
    let temporary = destination.with_extension("download");
    fs::write(&temporary, bytes)
        .map_err(|error| format!("Cloudflare Tunnel could not be saved: {error}"))?;
    fs::rename(&temporary, destination)
        .map_err(|error| format!("Cloudflare Tunnel could not be installed: {error}"))?;
    Ok(())
}

async fn start_quick_tunnel(
    cloudflared: &Path,
    local_port: u16,
) -> Result<(Child, String), String> {
    let mut command = hidden_command(cloudflared);
    command
        .args([
            "tunnel",
            "--no-autoupdate",
            "--loglevel",
            "info",
            "--url",
            &format!("http://127.0.0.1:{local_port}"),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command
        .spawn()
        .map_err(|error| format!("Cloudflare Tunnel could not be started: {error}"))?;

    let (url_tx, url_rx) = mpsc::channel();
    if let Some(stdout) = child.stdout.take() {
        monitor_tunnel_output(stdout, url_tx.clone());
    }
    if let Some(stderr) = child.stderr.take() {
        monitor_tunnel_output(stderr, url_tx);
    }
    let startup_result = tauri::async_runtime::spawn_blocking(move || {
        let deadline = Instant::now() + Duration::from_secs(60);
        let mut public_url = None;
        let mut ready = false;
        loop {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return Err("Cloudflare Tunnel did not become ready in time.".to_string());
            }
            match url_rx.recv_timeout(remaining) {
                Ok(TunnelEvent::PublicUrl(url)) => public_url = Some(url),
                Ok(TunnelEvent::Ready) => ready = true,
                Err(_) => return Err("Cloudflare Tunnel did not become ready in time.".to_string()),
            }
            if ready {
                if let Some(url) = public_url {
                    return Ok(url);
                }
            }
        }
    })
    .await;
    let public_url = match startup_result {
        Ok(Ok(url)) => url,
        Ok(Err(error)) => {
            terminate_child(&mut child);
            return Err(error);
        }
        Err(error) => {
            terminate_child(&mut child);
            return Err(format!("Cloudflare Tunnel startup failed: {error}"));
        }
    };

    match child.try_wait() {
        Ok(None) => {}
        Ok(Some(_)) => return Err("Cloudflare Tunnel stopped during startup.".into()),
        Err(error) => {
            terminate_child(&mut child);
            return Err(format!(
                "Cloudflare Tunnel status could not be read: {error}"
            ));
        }
    }
    if let Err(error) = wait_for_public_tunnel(&public_url, &mut child).await {
        terminate_child(&mut child);
        return Err(error);
    }
    Ok((child, public_url))
}

async fn wait_for_public_tunnel(public_url: &str, child: &mut Child) -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(45);
    let mut last_error = "public DNS record is not ready".to_string();

    while Instant::now() < deadline {
        match child.try_wait() {
            Ok(None) => {}
            Ok(Some(status)) => {
                return Err(format!(
                    "Cloudflare Tunnel stopped before it became reachable ({status})."
                ));
            }
            Err(error) => {
                return Err(format!(
                    "Cloudflare Tunnel status could not be read: {error}"
                ));
            }
        }

        match check_public_tunnel(public_url).await {
            Ok(true) => return Ok(()),
            Ok(false) => last_error = "public health endpoint is not ready".to_string(),
            Err(error) => last_error = error,
        }
        tokio::time::sleep(Duration::from_millis(750)).await;
    }

    Err(format!(
        "Cloudflare Tunnel was announced but never became publicly reachable: {last_error}"
    ))
}

async fn public_tunnel_reachable(server_url: &str) -> bool {
    check_public_tunnel(server_url).await.unwrap_or(false)
}

async fn check_public_tunnel(server_url: &str) -> Result<bool, String> {
    let http_url = server_url.replacen("wss://", "https://", 1);
    let parsed =
        Url::parse(&http_url).map_err(|error| format!("Invalid Cloudflare Tunnel URL: {error}"))?;
    let host = parsed
        .host_str()
        .ok_or_else(|| "Cloudflare Tunnel URL has no hostname.".to_string())?;
    let addresses = resolve_with_cloudflare_doh(host).await?;
    if addresses.is_empty() {
        return Ok(false);
    }

    let health_url = format!("https://{host}/health");
    for address in addresses {
        let client = reqwest::Client::builder()
            .resolve(host, SocketAddr::new(address, 443))
            .timeout(Duration::from_secs(8))
            .build()
            .map_err(|error| format!("Public tunnel health client failed: {error}"))?;
        if let Ok(response) = client.get(&health_url).send().await {
            if response.status().is_success() {
                if let Ok(body) = response.text().await {
                    if body.trim() == "ok" {
                        return Ok(true);
                    }
                }
            }
        }
    }
    Ok(false)
}

async fn resolve_with_cloudflare_doh(host: &str) -> Result<Vec<IpAddr>, String> {
    let lookup_url = format!("https://cloudflare-dns.com/dns-query?name={host}&type=A");
    let response = reqwest::Client::new()
        .get(lookup_url)
        .header("accept", "application/dns-json")
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .map_err(|error| format!("Cloudflare DNS lookup failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "Cloudflare DNS lookup returned HTTP {}.",
            response.status()
        ));
    }
    let body = response
        .text()
        .await
        .map_err(|error| format!("Cloudflare DNS response could not be read: {error}"))?;
    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|error| format!("Cloudflare DNS response was invalid: {error}"))?;
    if json.get("Status").and_then(|value| value.as_u64()) != Some(0) {
        return Ok(Vec::new());
    }

    Ok(json
        .get("Answer")
        .and_then(|value| value.as_array())
        .into_iter()
        .flatten()
        .filter(|answer| answer.get("type").and_then(|value| value.as_u64()) == Some(1))
        .filter_map(|answer| answer.get("data").and_then(|value| value.as_str()))
        .filter_map(|address| address.parse::<IpAddr>().ok())
        .collect())
}

fn terminate_child(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

fn monitor_tunnel_output<R>(reader: R, sender: mpsc::Sender<TunnelEvent>)
where
    R: Read + Send + 'static,
{
    std::thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            if let Some(url) = extract_quick_tunnel_url(&line) {
                let _ = sender.send(TunnelEvent::PublicUrl(url));
            }
            if line.contains("Registered tunnel connection") {
                let _ = sender.send(TunnelEvent::Ready);
            }
        }
    });
}

fn extract_quick_tunnel_url(line: &str) -> Option<String> {
    let start = line.find("https://")?;
    let candidate = line[start..]
        .split_whitespace()
        .next()?
        .trim_matches(|character: char| {
            matches!(character, '|' | '"' | '\'' | '`' | '<' | '>' | ')' | '(')
        });
    let url = Url::parse(candidate).ok()?;
    let host = url.host_str()?;
    if url.scheme() == "https" && host.ends_with(".trycloudflare.com") {
        Some(format!("https://{host}"))
    } else {
        None
    }
}

fn hidden_command(executable: &Path) -> Command {
    let mut command = Command::new(executable);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

#[cfg(test)]
mod tests {
    use super::{
        cloudflared_works, extract_quick_tunnel_url, hidden_command, start_local_server,
        start_quick_tunnel,
    };
    use std::path::Path;

    fn run_yjs_smoke(server: &str) -> std::process::Output {
        let script = r#"
const Y = require('yjs');
const { WebsocketProvider } = require('y-websocket');
const WebSocket = require('ws');
const server = process.argv[1];
console.error(`server:${server}`);
const room = `rust-smoke-${Date.now()}`;
const first = new Y.Doc();
const second = new Y.Doc();
first.getMap('smoke').set('value', 'connected');
let firstProvider;
let secondProvider;
const finish = code => {
  firstProvider?.destroy();
  secondProvider?.destroy();
  first.destroy();
  second.destroy();
  process.exit(code);
};
const check = () => {
  if (second.getMap('smoke').get('value') === 'connected') finish(0);
};
second.getMap('smoke').observe(check);
firstProvider = new WebsocketProvider(server, room, first, { WebSocketPolyfill: WebSocket });
secondProvider = new WebsocketProvider(server, room, second, { WebSocketPolyfill: WebSocket });
firstProvider.on('status', event => console.error(`first:${event.status}`));
secondProvider.on('status', event => console.error(`second:${event.status}`));
firstProvider.on('sync', synced => console.error(`first:sync:${synced}`));
secondProvider.on('sync', synced => console.error(`second:sync:${synced}`));
setInterval(check, 50);
setTimeout(() => {
  console.error('Yjs clients did not synchronize');
  finish(1);
}, 20000);
"#;
        hidden_command(Path::new("node"))
            .args(["-e", script, server])
            .current_dir("..")
            .output()
            .expect("Node smoke client could not be started")
    }

    #[test]
    fn extracts_only_valid_quick_tunnel_urls() {
        assert_eq!(
            extract_quick_tunnel_url(
                "INF +------------------------------------------------------------+ https://bright-map.trycloudflare.com |"
            )
            .as_deref(),
            Some("https://bright-map.trycloudflare.com")
        );
        assert!(extract_quick_tunnel_url("https://example.com").is_none());
        assert!(extract_quick_tunnel_url("not a URL").is_none());
    }

    #[tokio::test(flavor = "current_thread")]
    async fn embedded_server_exposes_its_health_endpoint() {
        let (port, shutdown) = start_local_server();
        let response = reqwest::get(format!("http://127.0.0.1:{port}/health"))
            .await
            .expect("health request failed");

        assert!(response.status().is_success());
        assert_eq!(response.text().await.unwrap(), "ok");
        let _ = shutdown.send(());
    }

    #[tokio::test(flavor = "current_thread")]
    #[ignore = "requires the cloudflared executable and internet access"]
    async fn quick_tunnel_syncs_two_yjs_clients_through_the_embedded_server() {
        let cloudflared = Path::new("cloudflared");
        assert!(cloudflared_works(cloudflared));
        let (port, shutdown) = start_local_server();
        let local_output = run_yjs_smoke(&format!("ws://127.0.0.1:{port}"));
        assert!(
            local_output.status.success(),
            "Local Yjs smoke test failed: {}",
            String::from_utf8_lossy(&local_output.stderr)
        );
        let (mut tunnel, public_url) = start_quick_tunnel(cloudflared, port)
            .await
            .expect("quick tunnel failed to start");

        assert!(public_url.ends_with(".trycloudflare.com"));
        let websocket_url = public_url.replacen("https://", "wss://", 1);
        let output = run_yjs_smoke(&websocket_url);
        assert!(
            output.status.success(),
            "Initial Yjs tunnel smoke test failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        let _ = tunnel.kill();
        let _ = tunnel.wait();

        let (mut replacement_tunnel, replacement_url) = start_quick_tunnel(cloudflared, port)
            .await
            .expect("replacement quick tunnel failed to start");
        assert!(replacement_url.ends_with(".trycloudflare.com"));
        let replacement_websocket_url = replacement_url.replacen("https://", "wss://", 1);
        let replacement_output = run_yjs_smoke(&replacement_websocket_url);
        let _ = replacement_tunnel.kill();
        let _ = replacement_tunnel.wait();
        let _ = shutdown.send(());
        assert!(
            replacement_output.status.success(),
            "Replacement Yjs tunnel smoke test failed: {}",
            String::from_utf8_lossy(&replacement_output.stderr)
        );
    }
}
