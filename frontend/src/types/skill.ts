/** Skill 作用域 */
export type SkillScope = 'global' | 'session' | 'message'

/** Skill: 受约束的 AI 能力单元 */
export interface Skill {
  id: string
  name: string
  description: string
  icon: string

  /** 分类 */
  category: SkillCategory

  /** 作用域: global=始终生效, session=会话级, message=消息级 */
  scope: SkillScope

  /** 系统提示词 - 定义 AI 的角色和行为约束 */
  system_prompt: string

  /** 输入模板 - 支持 {{variable}} 占位符 */
  input_template: string

  /** 输出格式要求 */
  output_format: string

  /** 模型参数 */
  temperature?: number
  max_tokens?: number

  /** 元数据 */
  author: string
  version: string
  tags: string[]
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export type SkillCategory =
  | 'developer'
  | 'code'
  | 'design'
  | 'content'
  | 'analysis'
  | 'research'
  | 'automation'
  | 'data'
  | 'docs'

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  developer: '开发',
  code: '代码',
  design: '设计',
  content: '创作',
  analysis: '分析',
  research: '研究',
  automation: '自动化',
  data: '数据处理',
  docs: '文档',
}

export const SKILL_SCOPE_LABELS: Record<SkillScope, string> = {
  global: '全局',
  session: '会话级',
  message: '消息级',
}

/** 创建/编辑 Skill 的表单数据 */
export interface SkillFormData {
  name: string
  description: string
  icon: string
  category: SkillCategory
  scope: SkillScope
  system_prompt: string
  input_template: string
  output_format: string
  temperature: number
  max_tokens: number
  tags: string[]
}
