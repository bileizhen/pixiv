# 🎨 Pixiv Proxy Pro (Fluent Design)

<div align="center">
<img src="https://github.com/bileizhen/pixiv/raw/main/PixPin_2026-01-02_01-32-07.png" alt="图片alt" title="图片title">  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbileizhen%2Fpixiv)

**基于 Vercel Edge Runtime 的现代化 Pixiv 反向代理服务**

[特性](#-特性) • [部署教程](#-部署教程) • [R-18 配置](#-r-18-及高级配置) • [免责声明](#-免责声明)

</div>

## 📖 简介

这是一个运行在 Vercel 上的 Pixiv 图片反向代理服务。不同于普通的 Nginx 转发，本项目提供了一个**全功能的 Fluent Design 2.0 前端界面**，支持智能解析 Pixiv 作品链接，查看高清原图、播放/下载动图（Ugoira），并支持导出 GIF。

后端采用 **Edge Runtime** 构建，彻底突破 Vercel 普通函数的 4.5MB 响应限制，支持超大动图和 ZIP 包的流式传输。

## ✨ 特性

- 🎨 **Fluent Design 2.0 UI**：采用 Windows 11 设计语言，支持 Mica 材质背景、亚克力模糊与微交互动画。
- ⚡ **Edge Runtime 内核**：支持流式传输（Streaming），无视 4.5MB 限制，轻松代理 100MB+ 的动图资源。
- 🎬 **Ugoira 动图增强**：
  - 在线播放：前端自动下载 ZIP 并解码播放。
  - **导出 GIF**：利用 Web Worker 多线程将动图转为 GIF 下载。
  - 原图打包：直接下载 Pixiv 原始 ZIP 帧数据。
- 🔞 **R-18 完美支持**：
  - 支持通过环境变量或前端设置注入 Cookie。
  - 自动伪装 User-Agent，完美通过 Pixiv 风控验证。
- 📱 **响应式设计**：完美适配 PC 与移动端，支持剪贴板自动粘贴。
- 🚀 **全球 CDN 加速**：图片资源经由 Vercel Edge Network 缓存，二次访问秒开。

## 🛠️ 部署教程

### 方法一：一键部署 (推荐)

1. Fork 本项目到您的 GitHub 账号。
2. 点击上方的 **Deploy with Vercel** 按钮。
3. 在 Vercel 中绑定您的 GitHub 仓库。
4. 等待部署完成即可使用！

### 方法二：手动部署

1. 安装 Vercel CLI: `npm i -g vercel`
2. 在项目根目录下运行:
   ```bash
   vercel
   ```


---

## ⚙️ R-18 及高级配置

默认情况下，由于 Pixiv 的限制，游客无法查看 R-18 内容。您需要提供一个已登录账号的 Cookie。本服务支持两种方式配置 Cookie：

### 方式 A：前端自定义 (推荐，最灵活)

1. 打开部署好的网页。
2. 点击右上角的 **⚙️ 设置** 按钮。
3. 粘贴您的 Pixiv Cookie（获取方法见下文）。
4. 保存后即可立即生效，Cookie 仅保存在您浏览器的 LocalStorage 中，不会上传到服务器，安全无忧。

### 方式 B：服务端环境变量 (作为默认配置)

如果您希望所有访问者都能直接看 R-18 内容（慎用），可以在 Vercel 后台配置：

1. 进入 Vercel 控制台 -> Settings -> **Environment Variables**。
2. 添加变量：
   - **Key**: `PIXIV_COOKIE`
   - **Value**: (您的完整 Cookie 字符串)
3. **重新部署 (Redeploy)** 项目以生效。

### 🍪 如何获取 Cookie？

1. 在浏览器（推荐使用无痕模式）登录 [Pixiv](https://www.pixiv.net)。
2. 按 `F12` 打开开发者工具，切换到 **Network (网络)** 标签页。
3. 随便点击一张图片，在列表中找到请求。
4. 在右侧 **Request Headers (请求头)** 中找到 `Cookie`。
5. 复制 `Cookie: ` 后面的一长串字符（通常包含 `first_visit_datetime`, `PHPSESSID`, `device_token` 等）。

---

## 📂 项目结构

```text
.
├── api/
│   ├── index.js        # [核心] 图片代理接口 (Edge Runtime)，处理大文件下载
│   └── analyze.js      # [核心] 信息解析接口 (Node.js)，处理元数据和 Cookie 逻辑
├── public/
│   └── index.html      # 前端单页应用 (Fluent Design + JSZip + Gif.js)
├── vercel.json         # 路由重写规则
└── README.md           # 说明文档
```

## ⚠️ 常见问题

**Q: 为什么动图播放/下载 GIF 时进度条不动？**

>A: 请确保您的 `api/index.js` 开启了 `runtime: 'edge'`。如果使用的是 Node.js 运行时，超过 4.5MB 的动图会被 Vercel 截断，导致前端解析失败。本项目默认已配置好 Edge Runtime。

**Q: R-18 内容显示 "Artwork restricted" 或加载失败？**

>A: 这是因为 Cookie 失效或未配置。请点击网页右上角设置，重新填入最新的 Cookie。

**Q: 背景图不显示？**

>A: 背景图调用了第三方随机二次元图片 API。如果该 API 挂了，背景可能变黑，但不影响功能使用。

## ⚖️ 免责声明

1. 本项目仅供技术研究和学习交流使用。
2. 本项目**不存储**任何图片数据，所有流量均为实时转发。
3. 使用本服务访问的内容版权归 Pixiv 及原作者所有。
4. 请勿将本服务用于商业用途或大规模爬虫采集，由此产生的任何法律责任由使用者自行承担。
5. 请自觉遵守当地法律法规。

## 📄 License

[MIT](LICENSE)
