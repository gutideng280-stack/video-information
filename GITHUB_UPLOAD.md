# GitHub 上传步骤

## 📋 前置准备

1. 确保已安装 [Git](https://git-scm.com/downloads)
2. 注册并登录 [GitHub](https://github.com) 账号

## 🚀 步骤一：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写仓库名称：`video-information`
3. 选择 Public 或 Private
4. **不要**勾选 "Initialize this repository with" 选项
5. 点击 "Create repository"

## 💻 步骤二：初始化本地 Git 仓库

在项目文件夹 `c:\Users\小峰\TRAE_solo\video_information` 中打开命令行（PowerShell 或 CMD），依次执行：

```bash
# 1. 初始化 Git
git init

# 2. 添加所有文件
git add .

# 3. 提交文件
git commit -m "Initial commit: Video Information Tool v2.0.0"

# 4. 重命名分支为 main
git branch -M main

# 5. 关联远程仓库（将 YOUR_USERNAME 替换为您的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/video-information.git

# 6. 推送到 GitHub
git push -u origin main
```

## 🌐 步骤三：启用 GitHub Pages（可选但推荐）

1. 访问您的 GitHub 仓库页面
2. 点击 "Settings" 标签
3. 左侧菜单选择 "Pages"
4. 在 "Build and deployment" 部分：
   - Source: Deploy from a branch
   - Branch: main / root
5. 点击 "Save"
6. 等待几分钟，页面会显示访问地址，类似：
   `https://YOUR_USERNAME.github.io/video-information/`

## 📁 项目文件清单

```
video-information/
├── index.html              # 主页面
├── README.md              # 项目文档
├── .gitignore            # Git 忽略文件
├── css/
│   └── styles.css        # 样式表
└── js/
    ├── app.js           # 主应用程序
    ├── components/
    │   ├── LinkInput.js      # 链接输入组件
    │   ├── QueryButton.js    # 查询按钮组件
    │   └── DataTable.js      # 数据表格组件
    ├── services/
    │   ├── youtube.js       # YouTube API 服务
    │   ├── bilibili.js      # Bilibili API 服务
    │   └── twitter.js       # Twitter API 服务
    └── utils/
        └── linkParser.js    # 链接解析工具
```

## ⚡ 快速命令参考

```bash
# 查看状态
git status

# 查看修改
git diff

# 提交更改
git add .
git commit -m "Your commit message"
git push

# 拉取更新
git pull

# 查看历史
git log
```

## 🎉 完成！

上传成功后，您可以：
- 通过 GitHub 分享项目链接
- 启用 GitHub Pages 在线使用
- 接受他人的 Pull Request
- 继续开发新功能
