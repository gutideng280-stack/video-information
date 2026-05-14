@echo off
chcp 65001 >nul 2>&1
title Bilibili Video Stats Tool - Local Server
cd /d "%~dp0"
echo ========================================
echo  Bilibili Video Stats - Local Server
echo ========================================
echo.
echo  Starting local server...
echo  Open browser: http://localhost:8080
echo  Press Ctrl+C to stop server
echo.
echo ========================================
echo.

python -m http.server 8080

pause
