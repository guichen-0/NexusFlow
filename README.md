# NexusFlow - AI 多模型协作任务引擎

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-6366f1?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square" alt="FastAPI">
</p>

## 项目简介

NexusFlow 是一个**AI 多模型协作任务引擎**，支持通过自然语言描述自动拆解任务为 DAG 工作流，调度多个 AI Agent 协作完成复杂任务。

### 核心特性

- 🧠 **智能任务解析**：自然语言输入 → AI 自动拆解为 DAG 工作流
- 🤖 **多 Agent 协作**：内置 5 种专业 Agent（需求分析、代码生成、代码审查、自动修复、报告生成）
- ⚡ **并行执行引擎**：基于拓扑排序的 DAG 执行引擎，支持节点并行执行
- 📊 **Token 消耗统计**：实时统计 AI 调用消耗，支持可视化分析
- 🎨 **精美 UI 界面**：暗色玻璃拟态主题，流畅动画效果

## 8 个内置工作流模板

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

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React + TypeScript)          │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│   │  工作台     │  │  工作流编辑器 │  │  数据分析    │ │
│   └─────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────────┐
│                      后端 (Python + FastAPI)             │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │ 任务解析器  │ │ 工作流引擎  │ │     模型路由器      │ │
│  └────────────┘ └────────────┘ └────────────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │ Agent 编排 │ │  AI 服务   │ │     存储服务        │ │
│  └────────────┘ └────────────┘ └────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## 快速开始

### 环境要求

- Python 3.14+
- Node.js 18+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/nexusflow.git
cd nexusflow
```

### 2. 启动后端

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python run.py
```

后端将运行在 `http://localhost:8000`
API 文档：`http://localhost:8000/docs`

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将运行在 `http://localhost:5173`

### 4. 访问应用

打开浏览器访问 `http://localhost:5173`

## 使用说明

### 创建任务

1. 在首页输入框中输入你的需求
2. 例如：`帮我写一个用户登录注册功能，用 Python Flask`
3. 点击「执行」按钮

### 选择工作流模板

1. 访问「工作流」页面
2. 选择一个预设模板
3. 点击「使用此模板」

### 查看数据分析

1. 访问「数据分析」页面
2. 查看 Token 消耗统计
3. 查看执行历史记录

## 项目截图

> 请在此处添加你的项目截图

### 工作台
![工作台](./screenshots/home.png)

### 工作流模板
![工作流模板](./screenshots/workflows.png)

### 任务执行
![任务执行](./screenshots/task.png)

### 数据分析
![数据分析](./screenshots/analytics.png)

## API 文档

### 工作流 API

```
GET  /api/v1/workflows          # 获取所有工作流
GET  /api/v1/workflows/{id}      # 获取工作流详情
POST /api/v1/workflows           # 创建工作流
```

### 任务 API

```
GET  /api/v1/tasks               # 获取所有任务
POST /api/v1/tasks               # 创建任务
GET  /api/v1/tasks/{id}          # 获取任务详情
POST /api/v1/tasks/{id}/execute  # 执行任务
```

### 分析 API

```
GET /api/v1/analytics/summary          # 获取统计摘要
GET /api/v1/analytics/token-usage       # 获取 Token 消耗
GET /api/v1/analytics/execution-history # 获取执行历史
```

## 配置说明

### 环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
# AI 服务配置
USE_MOCK_MODE=true              # 设置为 false 启用真实 API
AI_API_KEY=your-api-key          # 你的 API Key
AI_BASE_URL=https://api.openai.com/v1

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

### Mock 模式

默认启用 Mock 模式，所有 AI 调用返回模拟数据。适合：
- 演示项目功能
- 快速开发调试
- 无 API Key 时体验完整功能

## 技术栈

### 后端

- **FastAPI** - 高性能 Web 框架
- **Pydantic** - 数据验证
- **SQLite** - 轻量级数据库
- **OpenAI SDK** - AI 服务集成

### 前端

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **shadcn/ui** - UI 组件库
- **React Flow** - 工作流可视化
- **Recharts** - 数据图表
- **Zustand** - 状态管理

## 开发说明

### 项目结构

```
nexusflow/
├── backend/
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── core/         # 核心逻辑
│   │   ├── models/      # 数据模型
│   │   └── services/     # 服务层
│   ├── workflows/        # 工作流定义
│   └── run.py           # 启动脚本
├── frontend/
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/       # 页面
│   │   ├── stores/      # 状态管理
│   │   ├── services/    # API 服务
│   │   └── types/       # TypeScript 类型
│   └── ...
└── README.md
```

### 添加新工作流

1. 在 `backend/workflows/` 目录创建新文件
2. 定义工作流的节点结构
3. 在 `workflows.py` 中注册新工作流

## License

MIT License

## 联系方式

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
