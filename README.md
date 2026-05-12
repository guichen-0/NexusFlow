<p align="center">
  <img src="https://img.shields.io/badge/Version-2.1.0-6366f1?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square" alt="FastAPI">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

<h1 align="center">NexusFlow</h1>

<p align="center">
  <strong>AI Multi-Model Collaborative Task Engine</strong><br>
  AI 多模型协作任务引擎
</p>

<p align="center">
  <a href="#-核心特性">核心特性</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-功能模块">功能模块</a> ·
  <a href="#-技术架构">技术架构</a>
  <a href="#-api-文档">API</a>
</p>

---

## 项目简介

NexusFlow 是一个**AI 多模型协作任务引擎**，提供多轮对话、任务管理、DAG 工作流可视化编排、Agent 团队协作和在线代码沙箱六大核心能力。

### 它能做什么？

1. **AI 对话** — 多轮上下文对话，支持 SSE 流式输出，AI 记住完整对话历史
2. **Agent 团队** — 内置多 Agent 流水线协作，自然语言驱动的智能任务分工
3. **工作流编排** — 可视化 DAG 编辑器，预设 8 个工作流模板，支持串行/并行节点
4. **代码沙箱** — 在线执行 Python/JavaScript/TypeScript，支持文件管理、终端、权限控制
5. **Skills 系统** — 3 个全局 Skill + 20+ 可选 Skill，深度控制 AI 行为和风格
6. **数据分析** — Token 消耗统计、执行历史可视化、模型使用分布

只需输入一行需求，NexusFlow 就能自动：
- 解析需求并生成可执行的 DAG 工作流
- 分配专业 Agent 协作完成复杂任务
- 实时追踪进度、统计 Token 消耗
- 执行结果可无缝接入对话进行迭代优化

## ✨ 核心特性

- **多轮 AI 对话** — 独立聊天页面，多会话管理，SSE 流式输出，上下文记忆，文件上传
- **Agent 团队** — 3 Agent 流水线（分析→执行→审查），自然语言驱动，实时协作状态
- **Skills 系统** — 全局 Skill 始终生效 + 会话/消息级 Skill 灵活切换，深度控制 AI 行为
- **代码沙箱** — CodeMirror 编辑器，在线执行 Python/JS/TS，SSE 流式输出，文件上传下载
- **权限控制** — 9 种内置权限模板，支持联网/文件/子进程/终端/Import 白黑名单
- **任务↔对话联动** — 任务完成后可"继续对话"将上下文带入聊天，迭代优化结果
- **智能任务解析** — 自然语言输入，AI 自动拆解为 DAG 工作流
- **并行执行引擎** — 基于拓扑排序的 DAG 引擎，支持节点级并行
- **多模型支持** — 兼容 DeepSeek / OpenAI / GPT 等所有 OpenAI 格式 API
- **Token 消耗统计** — 实时追踪 AI 调用成本，可视化分析面板
- **8 个内置模板** — 覆盖代码工厂、内容创作、数据处理、测试生成等场景
- **玻璃拟态 UI** — 暗色/浅色双主题 + Indigo-Purple 渐变 + 玻璃拟态效果
- **Mock 模式** — 零配置启动，所有 API 返回模拟数据，适合演示和开发
- **CORS 代理** — 内置 Vite 开发代理，无需后端即可直连外部 AI API

## 🚀 快速开始

### 环境要求

- Python 3.14+
- Node.js 18+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/guichen-0/NexusFlow.git
cd NexusFlow
```

### 2. 启动前端（推荐先体验）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:5173`

> 前端内置 Mock 模式，**无需后端和 API Key 即可完整体验所有功能**。

### 3. 连接真实 AI（可选）

进入设置页面（左侧边栏底部），关闭 Mock 模式后配置：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API Base URL | OpenAI 兼容的 API 地址 | `https://api.deepseek.com/v1` |
| API Key | 你的 API 密钥 | `sk-xxx` |
| 模型 | 要使用的模型 | `deepseek-v3` |

支持的 API 提供商：DeepSeek、OpenAI、通义千问、Moonshot 等所有兼容 OpenAI 格式的服务。

### 4. 启动后端（可选）

```bash
cd backend
pip install -r requirements.txt
python run.py
```

后端运行在 `http://localhost:8000` · API 文档：`http://localhost:8000/docs`

## 🧩 功能模块

### 对话 (Chat)
- 多会话管理（新建、切换、删除）
- SSE 流式输出，打字机效果
- 完整上下文记忆，多轮追问
- 文件/图片上传支持
- Skill 选择器（会话级 + 消息级）
- Agent 模式切换

### Agent 团队 (Agents)
- 3 Agent 流水线协作（分析→执行→审查）
- 自然语言驱动的任务分工
- 实时协作状态可视化
- 内置 Agent 角色定义

### 代码沙箱 (Sandbox)
- CodeMirror 6 编辑器，支持 Python/JS/TS/Bash
- SSE 流式执行输出
- 文件树管理（创建/删除/预览）
- 文件上传下载
- 终端命令执行
- 9 种内置权限模板（隔离/数据分析/网络/开发/全能等）
- Import 白黑名单强制执行

### Skills 系统
- 3 个全局 Skill（核心助手/推理框架/简洁输出），始终生效
- 20+ 可选 Skill，覆盖开发/代码/设计/创作/分析/研究/自动化/数据/文档
- 会话级 + 消息级灵活切换
- 深度 Agent 集成，影响 AI 行为和风格

### 工作流 (Workflows)
- 可视化 DAG 编辑器（React Flow）
- 8 个预置工作流模板
- 拓扑排序执行引擎
- 节点状态实时显示

### 数据分析 (Analytics)
- Token 消耗统计
- 执行历史可视化
- 模型使用分布

## 📦 内置工作流模板

| # | 模板名称 | 场景 | 节点数 |
|---|----------|------|--------|
| 1 | 自动代码工厂 | 开发者工具 | 5 |
| 2 | 内容创作流水线 | 内容创作 | 5 |
| 3 | 批量任务处理器 | 数据处理 | 4 |
| 4 | AI 训练数据生成 | 数据集构建 | 6 |
| 5 | 多语言文档翻译管线 | 国际化 | 4 |
| 6 | 代码 Review 自动化 | 代码审查 | 5 |
| 7 | AI 驱动的测试用例生成 | 测试自动化 | 5 |
| 8 | 智能客服对话流设计 | 对话系统 | 6 |

## 🏗 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                   前端 (React + TypeScript)                   │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │   聊天    │  │  工作流编辑器   │  │    数据分析面板       │  │
│  └──────────┘  └───────────────┘  └─────────────────────┘  │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │  任务管理  │  │  Agent 详情页  │  │     设置页面         │  │
│  └──────────┘  └───────────────┘  └─────────────────────┘  │
│                                                              │
│  Vite CORS 代理 (/api/ai-proxy → 外部 AI API)                │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (FastAPI)
┌────────────────────────┴────────────────────────────────────┐
│                   后端 (Python + FastAPI)                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐       │
│  │ 任务解析器  │ │ 工作流引擎  │ │    模型路由器       │       │
│  └────────────┘ └────────────┘ └────────────────────┘       │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐       │
│  │ Agent 编排  │ │  AI 服务   │ │    存储服务         │       │
│  └────────────┘ └────────────┘ └────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 Swagger 文档。

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/chat` | AI 对话（SSE 流式） |
| `POST` | `/api/v1/sandbox/execute` | 执行代码 |
| `POST` | `/api/v1/sandbox/execute/stream` | 流式执行代码（SSE） |
| `POST` | `/api/v1/sandbox/terminal` | 执行终端命令 |
| `POST` | `/api/v1/sandbox/workspace` | 创建工作空间 |
| `POST` | `/api/v1/sandbox/workspace/file/upload` | 上传文件 |
| `GET` | `/api/v1/sandbox/workspace/file/download` | 下载文件 |
| `GET` | `/api/v1/sandbox/permissions` | 获取权限模板 |
| `POST` | `/api/v1/sandbox/permissions` | 创建权限模板 |
| `GET` | `/api/v1/agents` | 获取 Agent 列表 |
| `POST` | `/api/v1/agents/orchestrate` | Agent 团队协作 |
| `GET` | `/api/v1/workflows` | 获取所有工作流模板 |
| `GET` | `/api/v1/analytics/summary` | 统计摘要 |

## ⚙️ 配置说明

### 前端（推荐）

在设置页面直接配置，无需修改代码或环境变量。

### 后端（可选）

复制 `.env.example` 为 `.env` 并配置：

```env
USE_MOCK_MODE=true
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.deepseek.com/v1
HOST=0.0.0.0
PORT=8000
```

## 🛠 技术栈

### 前端
- **React 19** — UI 框架
- **TypeScript** — 类型安全
- **Vite** — 极速构建 + 内置 CORS 代理
- **Tailwind CSS** — 原子化样式
- **React Flow** — 工作流 DAG 可视化
- **Recharts** — 数据图表
- **Zustand** — 轻量状态管理（含 localStorage 持久化）
- **CodeMirror 6** — 轻量代码编辑器
- **Lucide React** — 图标库

### 后端
- **FastAPI** — 高性能异步 Web 框架
- **Pydantic** — 数据验证与序列化
- **SQLite** — 轻量级持久化存储
- **OpenAI SDK** — AI 服务集成

## 📁 项目结构

```
nexusflow/
├── backend/
│   ├── app/
│   │   ├── api/          # API 路由 (chat, sandbox, agents, workflows, analytics, permissions)
│   │   ├── core/         # 核心引擎 (sandbox, permissions, agent_orchestrator, workflow_engine)
│   │   ├── services/     # 服务层 (ai_service, storage_service)
│   │   └── main.py       # FastAPI 入口
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/     # 聊天组件 (ChatMessage, ChatInput, SandboxPanel)
│   │   │   ├── sandbox/  # 沙箱组件 (CodeEditor, FileTree, OutputPanel, SandboxLayout, PermissionEditor)
│   │   │   ├── layout/   # 布局组件 (MainLayout, Sidebar, Header)
│   │   │   └── ui/       # 通用 UI 组件 (Toast, ProgressBar 等)
│   │   ├── pages/        # 页面 (Chat, Home, Sandbox, Skills, Agents, Workflows, Analytics, Settings)
│   │   ├── stores/       # Zustand 状态管理 (chatStore, sandboxStore, skillStore, agentStore, workflowStore)
│   │   ├── services/     # API & Mock 数据服务
│   │   ├── types/        # TypeScript 类型定义 (sandbox/, skill, agent)
│   │   └── lib/          # 工具函数 & 常量
│   └── package.json
└── README.md
```

## 📄 License

MIT License

## 👤 Author

- GitHub: [guichen-0](https://github.com/guichen-0)
