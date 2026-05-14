@echo off
cd /d "%~dp0"

echo ========================================
echo   GitHub Upload Script
echo ========================================
echo.

echo [1/6] Initialize Git repository...
git init

echo [2/6] Add all files...
git add .

echo [3/6] Commit files...
git commit -m "Initial commit: Video Information Tool v2.0.0"

echo [4/6] Rename branch to main...
git branch -M main

echo [5/6] Connect to remote repository...
git remote add origin https://github.com/gutideng280-stack/video-information.git

echo [6/6] Push to GitHub...
git push -u origin main --force

echo.
echo ========================================
echo   Upload Complete!
echo ========================================
echo.
echo Your project: https://github.com/gutideng280-stack/video-information
echo.
pause
