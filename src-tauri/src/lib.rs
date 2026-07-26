mod collab_host;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(collab_host::CollabHostState::default())
        .invoke_handler(tauri::generate_handler![
            collab_host::start_collab_host,
            collab_host::stop_collab_host,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            use tauri::Manager;
            app_handle
                .state::<collab_host::CollabHostState>()
                .shutdown_now();
        }
    });
}
