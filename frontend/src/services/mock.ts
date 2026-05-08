import { Workflow, Task } from '../types/workflow'
import { Agent } from '../types/agent'

// 8 个工作流模板
export const mockWorkflowTemplates: Workflow[] = [
  {
    id: 'code-factory',
    name: '自动代码工厂',
    description: '输入需求描述，自动生成可运行项目代码',
    category: 'developer',
    nodes: [
      { id: 'analyze', type: 'analyze', label: '需求分析', depends_on: [] },
      { id: 'generate', type: 'generate', label: '代码生成', depends_on: ['analyze'] },
      { id: 'review', type: 'review', label: '代码审查', depends_on: ['generate'] },
      { id: 'fix', type: 'fix', label: '自动修复', depends_on: ['review'] },
      { id: 'report', type: 'report', label: '输出报告', depends_on: ['fix'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'content-pipeline',
    name: '内容创作流水线',
    description: '输入主题，输出完整文章并配图',
    category: 'content',
    nodes: [
      { id: 'topic', type: 'topic', label: '选题', depends_on: [] },
      { id: 'outline', type: 'outline', label: '大纲', depends_on: ['topic'] },
      { id: 'write', type: 'write', label: '撰写', depends_on: ['outline'] },
      { id: 'illustrate', type: 'illustrate', label: '配图', depends_on: ['write'] },
      { id: 'format', type: 'format', label: '排版', depends_on: ['illustrate'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'batch-processor',
    name: '批量任务处理器',
    description: '输入模板和数据源，批量生成内容',
    category: 'data',
    nodes: [
      { id: 'parse', type: 'parse', label: '数据解析', depends_on: [] },
      { id: 'process', type: 'process', label: '逐条处理', depends_on: ['parse'] },
      { id: 'check', type: 'check', label: '质量检查', depends_on: ['process'] },
      { id: 'summary', type: 'summary', label: '结果汇总', depends_on: ['check'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'train-data-gen',
    name: 'AI 训练数据生成',
    description: '生成高质量的 AI 训练数据集',
    category: 'data',
    nodes: [
      { id: 'schema', type: 'schema', label: '数据结构设计', depends_on: [] },
      { id: 'generate', type: 'generate', label: '样本生成', depends_on: ['schema'] },
      { id: 'validate', type: 'validate', label: '质量验证', depends_on: ['generate'] },
      { id: 'augment', type: 'augment', label: '数据增强', depends_on: ['validate'] },
      { id: 'export', type: 'export', label: '导出数据集', depends_on: ['augment'] },
      { id: 'verify', type: 'verify', label: '最终校验', depends_on: ['export'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'translation-pipeline',
    name: '多语言文档翻译管线',
    description: '批量翻译文档并保持格式',
    category: 'content',
    nodes: [
      { id: 'detect', type: 'detect', label: '语言检测', depends_on: [] },
      { id: 'translate', type: 'translate', label: '翻译', depends_on: ['detect'] },
      { id: 'review', type: 'review', label: '人工审核', depends_on: ['translate'] },
      { id: 'publish', type: 'publish', label: '发布', depends_on: ['review'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'code-review',
    name: '代码 Review 自动化',
    description: '自动审查代码并生成改进建议',
    category: 'developer',
    nodes: [
      { id: 'scan', type: 'scan', label: '代码扫描', depends_on: [] },
      { id: 'analyze', type: 'analyze', label: '问题分析', depends_on: ['scan'] },
      { id: 'suggest', type: 'suggest', label: '改进建议', depends_on: ['analyze'] },
      { id: 'test', type: 'test', label: '测试验证', depends_on: ['suggest'] },
      { id: 'report', type: 'report', label: '审查报告', depends_on: ['test'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'testcase-gen',
    name: 'AI 驱动的测试用例生成',
    description: '根据代码自动生成测试用例',
    category: 'developer',
    nodes: [
      { id: 'analyze', type: 'analyze', label: '代码分析', depends_on: [] },
      { id: 'gen-case', type: 'gen-case', label: '生成用例', depends_on: ['analyze'] },
      { id: 'gen-data', type: 'gen-data', label: '测试数据', depends_on: ['gen-case'] },
      { id: 'execute', type: 'execute', label: '执行测试', depends_on: ['gen-data'] },
      { id: 'report', type: 'report', label: '测试报告', depends_on: ['execute'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  },
  {
    id: 'chatbot-design',
    name: '智能客服对话流设计',
    description: '设计多轮对话流程并生成训练数据',
    category: 'ai',
    nodes: [
      { id: 'intent', type: 'intent', label: '意图识别设计', depends_on: [] },
      { id: 'flow', type: 'flow', label: '对话流设计', depends_on: ['intent'] },
      { id: 'generate', type: 'generate', label: '生成对话', depends_on: ['flow'] },
      { id: 'validate', type: 'validate', label: '逻辑验证', depends_on: ['generate'] },
      { id: 'export', type: 'export', label: '导出配置', depends_on: ['validate'] },
      { id: 'train', type: 'train', label: '训练数据', depends_on: ['export'] }
    ],
    created_at: '2026-05-01T10:00:00Z'
  }
]

// 模拟任务列表
export const mockTasks: Task[] = [
  {
    id: 'task-001',
    input_text: '帮我写一个用户登录注册功能，用 Python Flask',
    workflow_id: 'code-factory',
    status: 'completed',
    progress: 100,
    created_at: '2026-05-08T10:00:00Z'
  },
  {
    id: 'task-002',
    input_text: '写一篇关于 AI 发展的文章',
    workflow_id: 'content-pipeline',
    status: 'running',
    progress: 60,
    created_at: '2026-05-08T11:00:00Z'
  },
  {
    id: 'task-003',
    input_text: '生成 100 条产品描述',
    workflow_id: 'batch-processor',
    status: 'completed',
    progress: 100,
    created_at: '2026-05-08T09:00:00Z'
  },
  {
    id: 'task-004',
    input_text: '翻译一份英文技术文档',
    workflow_id: 'translation-pipeline',
    status: 'pending',
    progress: 0,
    created_at: '2026-05-08T12:00:00Z'
  },
  {
    id: 'task-005',
    input_text: '审查我的代码库并给出改进建议',
    workflow_id: 'code-review',
    status: 'running',
    progress: 40,
    created_at: '2026-05-08T08:00:00Z'
  }
]

// 模拟统计数据
export const mockAnalytics = {
  total_executions: 156,
  successful_executions: 142,
  success_rate: 91.0,
  total_tokens: 1250000,
  avg_execution_time: 12.5,
  active_workflows: 8
}

// 模拟 Agent 协作过程
export const mockAgentProcess: Agent[] = [
  {
    id: 'analyze',
    name: '需求分析 Agent',
    role: '需求理解专家',
    status: 'completed',
    current_thought: '正在分析用户需求：需要实现用户登录注册功能，使用 Python Flask 框架...'
  },
  {
    id: 'generate',
    name: '代码生成 Agent',
    role: '全栈开发专家',
    status: 'working',
    current_thought: '正在生成用户认证相关代码，包括用户模型、路由和 JWT 验证...'
  },
  {
    id: 'review',
    name: '代码审查 Agent',
    role: '代码质量专家',
    status: 'thinking',
    current_thought: '等待代码生成完成后进行审查...'
  },
  {
    id: 'fix',
    name: '自动修复 Agent',
    role: '调试专家',
    status: 'idle',
    current_thought: ''
  },
  {
    id: 'report',
    name: '报告生成 Agent',
    role: '文档编写专家',
    status: 'idle',
    current_thought: ''
  }
]

// 模拟 Token 消耗数据（最近 7 天）
export const mockTokenUsage = [
  { date: '2026-05-02', tokens: 85000, requests: 25 },
  { date: '2026-05-03', tokens: 120000, requests: 38 },
  { date: '2026-05-04', tokens: 95000, requests: 30 },
  { date: '2026-05-05', tokens: 180000, requests: 55 },
  { date: '2026-05-06', tokens: 150000, requests: 45 },
  { date: '2026-05-07', tokens: 200000, requests: 62 },
  { date: '2026-05-08', tokens: 175000, requests: 52 }
]

// 模拟执行历史
export const mockExecutionHistory = [
  {
    id: 'exec-001',
    workflow_name: '自动代码工厂',
    status: 'completed',
    started_at: '2026-05-08T10:00:00Z',
    duration: 15,
    tokens_used: 8500
  },
  {
    id: 'exec-002',
    workflow_name: '内容创作流水线',
    status: 'completed',
    started_at: '2026-05-08T11:00:00Z',
    duration: 22,
    tokens_used: 12000
  },
  {
    id: 'exec-003',
    workflow_name: '代码 Review 自动化',
    status: 'running',
    started_at: '2026-05-08T12:00:00Z',
    duration: 8,
    tokens_used: 3200
  }
]

// 辅助函数
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function simulateExecution(nodes: any[], onProgress: (nodeId: string, status: string) => void) {
  for (const node of nodes) {
    onProgress(node.id, 'running')
    await delay(500 + Math.random() * 1000)
    onProgress(node.id, 'completed')
  }
}
