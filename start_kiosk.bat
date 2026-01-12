@echo off
title VitalSign Kiosk Launcher
echo ==================================================
echo   4-in-1 VITAL SIGN SYSTEM LAUNCHER
echo ==================================================

:: 0. CLEANUP: Kill any old processes to prevent conflicts
echo [1/4] Cleaning up old processes...
taskkill /F /IM "node.exe" >nul 2>&1
taskkill /F /IM "python.exe" >nul 2>&1
echo Done.

:: 1. Start Backend
echo [2/4] Starting Backend (Python)...

cd /d "c:\Users\VitalSign\Documents\4in1-vital-sign\backend"
:: Start python in a minimized window
start /min "VitalSign Backend" python run.py

:: 2. Start Frontend
echo [3/4] Starting Frontend (Node.js)...
cd /d "c:\Users\VitalSign\Documents\4in1-vital-sign\frontend"
:: Set BROWSER=none so npm start doesn't open a regular chrome tab
set BROWSER=none
start /min "VitalSign Frontend" npm start

:: 3. Wait for Frontend to be ready (Check port 3000)
:: 3. Wait for services (Simple Timer)
echo [3/4] Waiting 25 seconds for system to fully load...
:: We use a simple timer because sometimes PowerShell checks fail on restricted systems
timeout /t 25 /nobreak

:launch_kiosk
:: 4. Start Chrome in Kiosk Mode
echo [4/4] Launching Kiosk Interface...
start "" "C:\Users\VitalSign\AppData\Local\Google\Chrome\Application\chrome.exe" --kiosk http://localhost:3000 --overscroll-history-navigation=0 --disable-features=TouchpadOverscrollHistoryNavigation --disable-pinch --no-context-menu --no-first-run --no-default-browser-check --check-for-update-interval=31536000

echo System Started.
exit
