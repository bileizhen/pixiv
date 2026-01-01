# Pixiv Image Reverse Proxy

<div align="center">

![Pixiv Proxy](https://socialify.git.ci/v0/pixiv-proxy-ex/image?description=1&font=Inter&language=1&name=1&owner=1&pattern=Circuit%20Board&theme=Dark)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbileizhen%2Fpixiv)

</div>

一个基于 Vercel Serverless Functions 的 Pixiv 图片反向代理服务。
自带 Fluent Design 2.0 风格的现代化主页，支持自动生成代理链接、复制预览，并利用 Vercel Edge Network 全球 CDN 进行缓存加速。

## ✨ 特性

- 🚀 **Serverless 架构**：无需购买服务器，依托 Vercel 免费部署。
- ⚡ **全球 CDN 加速**：利用 `Cache-Control` 自动缓存图片，二次访问秒开。
- 🎨 **Fluent Design UI**：精美的 Windows 11 风格主页，支持深色模式、Mica 材质效果。
- 🛡️ **自动伪装**：自动处理 Referer 和 User-Agent，完美绕过 Pixiv 防盗链 (403 Forbidden)。
- 📱 **响应式设计**：完美适配 PC 与 移动端。

## 🛠️ 部署教程

### 方法一：一键部署 (推荐)

如果你已经将此代码 Fork 或上传到了 GitHub，只需点击上方的 **Deploy with Vercel** 按钮即可。

1. 修改 README 中的按钮链接，将 `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME` 替换为你自己的 GitHub 用户名和仓库名。
2. 点击按钮，Vercel 会自动克隆并部署。

### 方法二：手动部署

1. 安装 Vercel CLI: `npm i -g vercel`
2. 在项目根目录下运行:
   ```bash
   vercel
