// API 基础配置
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// 工作流分类
export const WORKFLOW_CATEGORIES = {
  developer: { label: '开发者工具', color: '#6366f1', icon: 'Code2' },
  content: { label: '内容创作', color: '#8b5cf6', icon: 'FileText' },
  data: { label: '数据处理', color: '#10b981', icon: 'Database' },
  ai: { label: 'AI 应用', color: '#f59e0b', icon: 'Bot' },
  general: { label: '通用', color: '#64748b', icon: 'Layers' },
} as const

// 节点状态颜色
export const NODE_STATUS_COLORS = {
  pending: '#64748b',
  running: '#6366f1',
  completed: '#10b981',
  failed: '#ef4444',
} as const

// 节点状态标签
export const NODE_STATUS_LABELS = {
  pending: '等待中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
} as const

// 默认模型列表
export const DEFAULT_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', capability: '旗舰' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', capability: '高效' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', capability: '基础' },
  { id: 'mimo-v2.5', name: 'MiMo V2.5', provider: 'MiMo', capability: '多模态' },
  { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro', provider: 'MiMo', capability: '旗舰Pro' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', capability: '旗舰' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', capability: '推理' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'DeepSeek', capability: '极速' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', provider: 'DeepSeek', capability: '旗舰Pro' },
] as const

// MiMo 计费方式
export const MIMO_BILLING_OPTIONS = [
  { id: 'usage', name: '用量计费', baseUrl: 'https://api.xiaomimimo.com/v1', format: 'openai' as const },
  { id: 'token-plan', name: '代币计划（订阅制）', baseUrl: 'https://token-plan-cn.xiaomimimo.com/anthropic', format: 'anthropic' as const },
] as const
