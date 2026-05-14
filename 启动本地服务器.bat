@echo off
title Bilibili 视频数据查询工具
cd /d "%~dp0"
echo ========================================
echo  视频互动数据统计工具 - 本地服务器
echo ========================================
echo.
echo  正在启动本地服务器...
echo  打开浏览器访问: http://localhost:8080
echo  按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

REM 使用 Python 启动简单 HTTP 服务器
python -m http.server 8080

pause
