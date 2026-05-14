# 📊 视频互动数据统计工具

一个简洁高效的在线工具，帮助用户批量查询和统计 YouTube、哔哩哔哩和 Twitter 视频的关键互动数据。

![版本](https://img.shields.io/badge/version-2.0.0-blue)
![许可证](https://img.shields.io/badge/license-MIT-green)
![平台支持](https://img.shields.io/badge/platform-YouTube%20%7C%20Bilibili%20%7C%20Twitter-red)

## ✨ 功能特点

- 🎯 **批量查询** - 支持同时查询多个视频数据（最多10个）
- 🌐 **三平台支持** - YouTube、哔哩哔哩和 Twitter 视频数据一网打尽
- 📊 **详细数据** - 展示播放数、点赞数、评论数、转发数等关键指标
- 🎨 **现代化界面** - 科技感十足的深色主题设计
- 📱 **响应式布局** - 完美适配桌面端和移动端
- ✨ **演示模式** - 一键填充示例数据，快速体验功能
- 🛡️ **智能容错** - 多 CORS 代理支持+模拟数据兜底，确保正常使用
- 📥 **数据导出** - 支持导出查询结果为 CSV 格式
- 🔀 **混合查询** - 可以在同一页面同时查询三个平台的视频！

## 🚀 快速开始

### 使用方式一：直接打开（推荐）

直接双击打开 `index.html` 文件，即可在浏览器中使用。

### 使用方式二：本地服务器

```bash
# 如果安装了 Python
python -m http.server 8000

# 如果安装了 Node.js
npx serve .
```

然后在浏览器访问 `http://localhost:8000`

### 使用方式三：部署到 GitHub Pages

1. 将项目文件推送到 GitHub 仓库
2. 在仓库 Settings → Pages 中启用 GitHub Pages
3. 选择 `main` 分支和根目录
4. 访问 `https://yourusername.github.io/repo-name`

## 📖 使用指南

### 1. 输入视频链接并选择平台

- 默认提供 3 个输入框（可自由增删）
- 支持动态添加更多输入框（最多 10 个）
- 每个输入框前有下拉菜单，可选择该视频的平台（YouTube/Bilibili/Twitter）
- 点击 **"填充演示"** 按钮可一键填充混合平台的示例数据
- 支持同时查询三个平台的视频！

**支持的链接格式：**

**YouTube：**
```
https://www.youtube.com/watch?v=xxxxxxxxxxx
https://youtu.be/xxxxxxxxxxx
https://www.youtube.com/shorts/xxxxxxxxxxx
```

**哔哩哔哩：**
```
https://www.bilibili.com/video/BV1xx411c7mD
https://www.bilibili.com/video/av12345678
https://b23.tv/xxxxxxxx
```

**Twitter/X：**
```
https://x.com/username/status/1234567890
https://twitter.com/username/status/1234567890
```

### 2. 查询数据

点击"确认查询"按钮，系统将自动：
1. 根据每个链接对应的平台解析视频链接
2. 获取视频数据（带 500ms 间隔，避免请求过快）
3. 在下方表格中展示结果

### 3. 查看和导出结果

- 表格支持点击表头排序
- 点击视频标题可直接跳转到原视频页面
- 可以导出数据为 CSV 文件（功能开发中）
- 数据来源标记：📋模拟数据 / 📄页面数据 / 🔌API数据

## 📊 显示的数据指标

| 指标 | 说明 | YouTube | Bilibili | Twitter |
|------|------|---------|----------|---------|
| 标题 | 视频标题 | ✅ | ✅ | ✅ |
| 发布时间 | 视频发布时间 | ✅ | ✅ | ✅ |
| 播放数 | 视频总播放次数 | ✅ | ✅ | ✅ |
| 点赞数 | 视频点赞总数 | ✅ | ✅ | ✅ |
| 评论数 | 视频评论总数 | ✅ | ✅ | ✅ |
| 转发数 | 视频转发/分享次数 | ❌ | ✅ | ✅ |

> ⚠️ 注意：YouTube 官方 API 不提供转发数，因此该字段显示为 "-"

## 🛠️ 技术实现

### 技术栈

- **HTML5** - 语义化标签
- **CSS3** - 现代 CSS 特性（Flexbox、Grid、动画）
- **JavaScript ES6+** - 原生 JavaScript，无框架依赖
- **CORS 代理** - Cloudflare Worker 代理 Bilibili API 请求（永久免费）

### Bilibili CORS 代理配置（重要）

Bilibili 官方 API 有 CORS 限制，需要部署代理才能使用。

#### 部署 Cloudflare Worker（推荐，免费）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** → **创建应用程序** → **创建 Worker**
3. 粘贴 `proxy/worker/index.js` 中的代码并部署
4. 部署后，复制 Worker URL（例如 `https://bilibili-proxy.你的名字.workers.dev`）
5. 打开 `js/services/bilibili.js`，将 `PROXY_BASE` 填入 Worker URL

> Cloudflare 免费版每天 10 万次请求，个人使用绑绑够！

#### 为什么需要代理？

Bilibili API 的 `Access-Control-Allow-Origin` 仅允许来自 `bilibili.com` 的请求，直接从浏览器调用会被 CORS 拦截。Cloudflare Worker 转发请求并添加正确的 `Referer` 头，从而绕过此限制。

### 项目结构

```
video-information/
├── index.html              # 主页面
├── README.md              # 项目说明
├── proxy/
│   └── worker/
│       └── index.js       # Cloudflare Worker 代理代码
├── css/
│   └── styles.css         # 样式表
└── js/
    ├── app.js             # 主应用程序
    ├── components/
    │   ├── LinkInput.js        # 链接输入组件
    │   ├── QueryButton.js      # 查询按钮组件
    │   └── DataTable.js        # 数据表格组件
    ├── services/
    │   ├── youtube.js     # YouTube API 服务
    │   ├── bilibili.js   # Bilibili API 服务
    │   └── twitter.js     # Twitter/X API 服务
    └── utils/
        └── linkParser.js  # 链接解析工具
```

### API 调用说明

#### YouTube

- 使用 YouTube Data API v3 获取完整信息（需要 API Key）
- 支持多个 CORS 代理自动切换（防止单个代理失效）
- 内置模拟数据兜底，确保功能可用

#### Bilibili

- 使用 B 站公开 API：`https://api.bilibili.com/x/web-interface/view`
- 支持 BV 号、AV 号、短链接解析
- 通过 Cloudflare Worker 代理绕过 CORS 限制
- 需要先按上方说明部署代理并配置 `PROXY_BASE`

#### Twitter/X

- 尝试从 Twitter/X 页面解析数据（使用 CORS 代理）
- 内置模拟数据确保功能可用
- 支持 tweet ID 解析

## ⚠️ 注意事项

1. **网络环境** - 建议使用稳定的网络连接
2. **Bilibili 代理** - 必须部署 Cloudflare Worker 并配置 `PROXY_BASE` 后才能查询 Bilibili 数据
3. **数据延迟** - 公开 API 数据可能有几分钟的延迟
4. **跨域问题** - 通过 Cloudflare Worker 代理解决
5. **Twitter 限制** - Twitter 数据获取受反爬虫机制限制

## 🎯 演示功能

为了方便快速测试，系统内置了演示功能：

- 页面加载时自动填充演示数据
- 每个平台都有对应的演示链接
- 点击 "填充演示" 按钮可重新填充
- 演示链接包含真实有效的视频 ID（可正常获取数据）

## 🔧 自定义配置

如需使用自己的 YouTube API Key，可以修改 `js/services/youtube.js` 文件：

```javascript
// 在文件开头添加您的 API Key
const YOUTUBE_API_KEY = 'YOUR_API_KEY_HERE';
```

## 📤 部署到 GitHub

### 方法一：使用 GitHub CLI（需要先安装）

```bash
# 初始化 git（如果还没有）
git init
git add .
git commit -m "Initial commit: Video Information Tool"

# 创建新仓库
gh repo create video-information --public --source=. --push
```

### 方法二：手动操作

1. 在 GitHub 上创建新仓库
2. 在本地初始化 git：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

3. 启用 GitHub Pages（Settings → Pages）

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📝 更新日志

### v2.0.0 (2024-12-14)

- 🎉 **重大更新** - 新增 Twitter/X 平台支持！
- 🐦 在平台选择中新增 Twitter 选项
- 📋 更新演示数据，包含三个平台的混合数据
- 🔧 新增 twitter.js 服务文件
- 📝 更新文档，说明三平台使用方法
- 🎨 更新数据表格，显示 Twitter 平台标识

### v1.2.0 (2024-12-14)

- 🎉 **重大更新** - 支持混合平台查询！
- 🔀 每个输入框可独立选择平台（YouTube/Bilibili）
- 📋 移除全局平台选择，改为每个链接前的下拉菜单
- 🎨 优化输入框布局，更美观更实用
- 📚 更新演示数据，默认展示两个平台的混合数据

### v1.1.0 (2024-12-14)

- ✨ 新增演示模式，一键填充示例数据
- 🛡️ 新增多 CORS 代理自动切换功能
- 🎯 新增模拟数据兜底，确保功能可用性
- 🎨 优化 UI 布局，默认输入框改为3个
- 🔧 改进错误处理和用户体验

### v1.0.0 (2024-12-14)

- ✨ 初始版本发布
- 🎯 支持 YouTube 和 Bilibili 双平台
- 📊 展示播放、点赞、评论、转发等数据
- 🎨 现代化深色主题界面
- 📱 完全响应式设计

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 致谢

- [Cloudflare Workers](https://workers.cloudflare.com/) - 提供免费的 CORS 代理服务
- [YouTube](https://www.youtube.com/) - 提供视频数据
- [Bilibili](https://www.bilibili.com/) - 提供视频数据
- [Twitter/X](https://x.com/) - 提供视频数据

---

⭐ 如果这个项目对您有帮助，请给它一个 Star！
