# 📈 小熙实时基金 (XiaoXi Real-time Fund)

**极简、优雅的个人基金实时监控看板**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Cloudflare Pages](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange?logo=cloudflare)](https://pages.cloudflare.com)

  <p align="center">
    <a href="#-功能特性">功能特性</a> •
    <a href="#-技术栈">技术栈</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#-部署指南">部署指南</a>
  </p>
</div>

---

## 📖 简介

**小熙实时基金** 是一款专为个人投资者打造的实时资产监控应用。它告别了繁杂的传统行情软件界面，采用现代化的 **Glassmorphism (毛玻璃)** 设计风格，提供清新、直观的资产概览。

不仅支持**实时估值**监控，更集成了 **AI 智能识别**功能，只需上传持仓截图，即可自动识别并录入资产数据。借助 **Cloudflare KV**，您的数据将在云端安全同步，随时随地掌握财富动态。

## ✨ 功能特性

- **🎨 极致UI体验**：精心打磨的毛玻璃拟态UI，支持深色/浅色模式平滑切换，数据可视化图表精美直观。
- **⏱️ 毫秒级实时估值**：直连东方财富实时数据接口，秒级刷新基金估值与大盘行情，告别盘后盲盒。
- **🤖 AI 智能持仓识别 (开发中 🚧)**：集成 OpenAI/ChatAnywhere 视觉模型，一键上传支付宝/天天基金持仓截图，自动解析持仓详情。
- **☁️ 云端数据同步**：基于 Cloudflare KV 的数据持久化，多设备（手机/电脑）无缝同步，无需账户注册体系（单用户模式）。
- **📊 专业图表分析**：内置 K线图、分时图及收益走势图，支持多维度资产分析与收益回撤监控。

## 🛠️ 技术栈

- **前端核心**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI 框架**: [Tailwind CSS v4](https://tailwindcss.com/) + Lucide Icons
- **数据可视化**: Recharts
- **部署 & 后端**: [Cloudflare Pages](https://pages.cloudflare.com/) + [Cloudflare Functions](https://developers.cloudflare.com/pages/platform/functions/)
- **数据存储**: [Cloudflare KV](https://developers.cloudflare.com/workers/runtime-apis/kv/)

## 🚀 快速开始

### 本地开发

1. **环境准备**
   确保您已安装 Node.js (v18+)。

2. **安装依赖**

   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:5173` 即可预览。

## ☁️ 部署指南 (Cloudflare Pages)

本项目深度集成 Cloudflare 生态，推荐使用 Cloudflare Pages 进行部署。

### 1. 准备工作

确保已安装 Wrangler CLI 并登录：

```bash
npm install -g wrangler
npx wrangler login
```

### 2. 配置云端存储 (KV)

为了实现多设备数据同步，我们需要创建一个 KV 命名空间：

### 2. 配置云端存储 (KV)

为了实现多设备数据同步，我们需要创建一个 KV 命名空间。

#### 方式一：Dashboard 一键绑定（推荐）

1. 登录 Cloudflare Pages 控制台，进入您的项目。
2. 转到 **Settings (设置) -> Functions (函数)**。
3. 找到 **KV Namespace Bindings** 区域，点击 **Add binding (添加绑定)**。
4. **Variable name (变量名称)** 输入: `FUND_DATA`。
5. **KV Namespace** 选择或创建一个新的空间（如 `xiaoxi-fund-kv`）。
6. 点击 **Save** 即可生效！无需修改代码。

#### 方式二：CLI 配置 (仅用于本地开发)

如果您需要在本地运行 (`npx wrangler pages dev`)，此步骤是必须的。
配置 `wrangler.toml`：

```bash
npx wrangler kv:namespace create FUND_DATA
# 将输出的 id 填入 wrangler.toml 的 [[kv_namespaces]] 部分
# binding = "FUND_DATA"
# id = "你的ID"
```

### 3. 配置 AI 密钥 (Secrets)

为了使用截图识别功能，需要在 Cloudflare 后台配置 API Key：

```bash
# 推荐使用 Cloudflare Dashboard 或命令行设置
npx wrangler pages secret put CHATANYWHERE_API_KEY
npx wrangler pages secret put VVEAI_API_KEY
```

### 4. 一键部署

```bash
npm run build
npx wrangler pages deploy dist --project-name xiaoxi-fund-web
```

> **重要提示 (Git 集成部署)**:
> 如果您连接了 GitHub 仓库进行自动部署，请务必在 Cloudflare Pages 后台 **Settings -> Builds & deployments** 中设置：
>
> - **Build command**: `npm run build`
> - **Build output directory**: `dist`
>
> `wrangler.toml` 虽然可以配置 KV，但目前的 Cloudflare Pages Git 集成可能不会从文件中读取构建命令。

> **提示**: 部署完成后，请务必在 Cloudflare Pages 后台 -> Settings -> Functions -> KV Namespace Bindings 中，检查 `FUND_DATA` 是否已正确绑定到您创建的 KV 空间。

## 📝 免责声明

- 本项目仅供个人学习与技术研究使用。
- 数据来源于公开网络接口（如东方财富），本项目不对数据的准确性与及时性做任何保证。
- **市场有风险，投资需谨慎**。本项目不构成任何投资建议。

---

<div align="center">
  Created with ❤️ by Antigravity
</div>
```
