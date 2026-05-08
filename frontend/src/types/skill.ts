/** Skill: 受约束的 AI 能力单元 */
export interface Skill {
  id: string
  name: string
  description: string
  icon: string

  /** 分类: developer | content | data | analysis | automation */
  category: SkillCategory

  /** 系统提示词 - 定义 AI 的角色和行为约束 */
  system_prompt: string

  /** 输入模板 - 支持 {{variable}} 占位符 */
  input_template: string

  /** 输出格式要求 */
  output_format: string

  /** 默认模型配置 */
  model: string
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

export type SkillCategory = 'developer' | 'content' | 'data' | 'analysis' | 'automation'

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  developer: '开发',
  content: '内容创作',
  data: '数据处理',
  analysis: '分析研究',
  automation: '自动化',
}

/** 创建/编辑 Skill 的表单数据 */
export interface SkillFormData {
  name: string
  description: string
  icon: string
  category: SkillCategory
  system_prompt: string
  input_template: string
  output_format: string
  model: string
  temperature: number
  max_tokens: number
  tags: string[]
}
