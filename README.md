<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-6366f1?style=flat-square" alt="Version">
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
  <a href="#-内置工作流">工作流模板</a> ·
  <a href="#-技术架构">技术架构</a> ·
  <a href="#-api-文档">API 文档</a>
</p>

---

## 项目简介

NexusFlow 是一个**AI 多模型协作任务引擎**，支持通过自然语言描述自动拆解任务为 DAG 工作流，调度多个 AI Agent 协作完成复杂任务。

只需输入一行需求描述，NexusFlow 就能自动：
1. 解析需求并生成可执行的 DAG 工作流
2. 分配专业 Agent（需求分析、代码生成、审查、修复、报告）
3. 并行执行节点、实时追踪进度
4. 统计 Token 消耗、生成可视化分析报告

## ✨ 核心特性

- **智能任务解析** — 自然语言输入，AI 自动拆解为 DAG 工作流
- **多 Agent 协作** — 内置 5 种专业 Agent：需求分析 / 代码生成 / 代码审查 / 自动修复 / 报告生成
- **并行执行引擎** — 基于拓扑排序的 DAG 引擎，支持节点级并行
- **Token 消耗统计** — 实时追踪 AI 调用成本，可视化分析面板
- **8 个内置模板** — 覆盖代码工厂、内容创作、数据处理、测试生成等场景
- **玻璃拟态 UI** — 暗色主题 + Indigo-Purple 渐变 + 玻璃拟态效果
- **Mock 模式** — 零配置启动，所有 API 返回模拟数据，适合演示和开发

## 🚀 快速开始

### 环境要求

- Python 3.14+
- Node.js 18+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/lzw-DDS/NexusFlow.git
cd NexusFlow
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务（默认 Mock 模式，无需 API Key）
python run.py
```

后端运行在 `http://localhost:8000` · API 文档：`http://localhost:8000/docs`

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:5173`

### 4. 开始使用

打开浏览器访问 `http://localhost:5173`，在首页输入你的需求即可开始。

## 📦 内置工作流

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
┌─────────────────────────────────────────────────────────┐
│                    前端 (React + TypeScript)              │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  工作台   │  │  工作流编辑器   │  │   数据分析面板    │  │
│  └──────────┘  └───────────────┘  └─────────────────┘  │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  任务列表  │  │  Agent 详情页  │  │    设置页面      │  │
│  └──────────┘  └───────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API (FastAPI)
┌────────────────────────┴────────────────────────────────┐
│                    后端 (Python + FastAPI)                │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ 任务解析器  │ │ 工作流引擎  │ │    模型路由器       │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ Agent 编排  │ │  AI 服务   │ │    存储服务         │   │
│  └────────────┘ └────────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 📡 API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 Swagger 文档。

### 主要端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/workflows` | 获取所有工作流模板 |
| `GET` | `/api/v1/workflows/{id}` | 获取工作流详情 |
| `POST` | `/api/v1/workflows` | 创建自定义工作流 |
| `GET` | `/api/v1/tasks` | 获取所有任务 |
| `POST` | `/api/v1/tasks` | 创建新任务 |
| `GET` | `/api/v1/tasks/{id}` | 获取任务详情 |
| `POST` | `/api/v1/tasks/{id}/execute` | 执行任务 |
| `GET` | `/api/v1/agents` | 获取 Agent 列表 |
| `GET` | `/api/v1/agents/{id}/thinking` | 查看 Agent 思维过程 |
| `GET` | `/api/v1/analytics/summary` | 统计摘要 |
| `GET` | `/api/v1/analytics/token-usage` | Token 消耗数据 |
| `GET` | `/api/v1/analytics/execution-history` | 执行历史 |

## ⚙️ 配置说明

复制 `.env.example` 为 `.env` 并配置：

```env
# Mock 模式（默认开启，无需 API Key）
USE_MOCK_MODE=true

# 切换到真实 API 时配置
AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com/v1

# 服务器
HOST=0.0.0.0
PORT=8000
```

## 🛠 技术栈

### 后端
- **FastAPI** — 高性能异步 Web 框架
- **Pydantic** — 数据验证与序列化
- **SQLite** — 轻量级持久化存储
- **OpenAI SDK** — AI 服务集成

### 前端
- **React 19** — UI 框架
- **TypeScript** — 类型安全
- **Vite** — 极速构建工具
- **Tailwind CSS** — 原子化样式
- **React Flow** — 工作流 DAG 可视化
- **Recharts** — 数据图表
- **Zustand** — 轻量状态管理
- **Lucide React** — 图标库

## 📁 项目结构

```
nexusflow/
├── backend/
│   ├── app/
│   │   ├── api/          # API 路由 (tasks, workflows, agents, analytics)
│   │   ├── core/         # 核心引擎 (task_parser, workflow_engine, model_router)
│   │   ├── models/       # Pydantic 数据模型
│   │   ├── services/     # 服务层 (ai_service, storage_service)
│   │   └── main.py       # FastAPI 入口
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # 通用组件 (layout, ui)
│   │   ├── pages/        # 页面 (Home, Workflows, Tasks, Analytics, Settings)
│   │   ├── stores/       # Zustand 状态管理
│   │   ├── services/     # API & Mock 数据服务
│   │   ├── types/        # TypeScript 类型定义
│   │   └── lib/          # 工具函数 & 常量
│   └── package.json
└── README.md
```

## 📄 License

MIT License

## 👤 Author

- GitHub: [lzw-DDS](https://github.com/lzw-DDS)
