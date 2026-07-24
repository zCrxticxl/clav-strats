@echo off
REM ============================================================
REM   Clav.Strats - Live Collab Launcher
REM   Double-click to start the collab server + tunnel.
REM   Close the two opened windows to stop the session.
REM ============================================================

REM --- CONFIG: set your ngrok static domain here -------------
REM     (from dashboard.ngrok.com  ->  Domains)
set NGROK_DOMAIN=clav-xyz.ngrok-free.app
REM -----------------------------------------------------------

cd /d "%~dp0"

echo Starting collab server (port 1234)...
start "Clav Collab Server" cmd /k npm run collab

REM give the server a moment to boot
timeout /t 2 >nul

echo Starting ngrok tunnel...
start "Clav Tunnel" cmd /k ngrok http --url=%NGROK_DOMAIN% 1234

echo.
echo ============================================================
echo   Session is starting in two windows.
echo   Collab URL:  wss://%NGROK_DOMAIN%
echo   (enter this once via the app's gear button)
echo.
echo   Close both windows to end the session.
echo ============================================================
echo.
pause

REM ============================================================
REM  ALTERNATIVE - Cloudflare quick tunnel (no ngrok, random URL)
REM  Comment out the ngrok line above and use this instead. The
REM  wss URL is printed in the tunnel window each time you start.
REM
REM  start "Clav Tunnel" cmd /k cloudflared tunnel --url http://localhost:1234
REM ============================================================
