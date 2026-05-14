@echo off
chcp 65001 >nul
echo ========================================
echo   GitHub 上传脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] 初始化 Git 仓库...
git init

echo [2/6] 添加所有文件...
git add .

echo [3/6] 提交文件...
git commit -m "Initial commit: Video Information Tool v2.0.0"

echo [4/6] 重命名分支为 main...
git branch -M main

echo [5/6] 关联远程仓库...
git remote add origin https://github.com/gutideng280-stack/video-information.git

echo [6/6] 推送到 GitHub...
git push -u origin main --force

echo.
echo ========================================
echo   上传完成！
echo ========================================
echo.
echo 您的项目地址：https://github.com/gutideng280-stack/video-information
echo.
pause
