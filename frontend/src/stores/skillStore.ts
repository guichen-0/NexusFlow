import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Skill, SkillCategory, SkillFormData } from '../types/skill'

const STORAGE_KEY = 'nexusflow-skills'

/** 内置示例 Skills */
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'builtin-code-gen',
    name: '代码生成',
    description: '根据需求描述生成高质量可运行代码，支持多种编程语言',
    icon: 'Code2',
    category: 'developer',
    system_prompt: '你是一个资深全栈开发工程师。用户会描述需求，你需要生成高质量的、可运行的代码。遵循以下原则：1) 代码要有清晰的注释 2) 遵循最佳实践和设计模式 3) 包含错误处理 4) 如果是 API，使用 RESTful 风格 5) 优先使用主流框架和库。',
    input_template: '请根据以下需求生成代码：\n\n{{input}}',
    output_format: '直接输出代码，使用对应语言的 markdown 代码块。代码后简要说明实现思路和注意事项。',
    model: 'deepseek-v3',
    temperature: 0.3,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['代码', '开发', '全栈'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-code-review',
    name: '代码审查',
    description: '审查代码质量，发现潜在问题并提供改进建议',
    icon: 'SearchCode',
    category: 'developer',
    system_prompt: '你是一个严格的代码审查专家。审查用户提交的代码时，关注：1) 安全漏洞（SQL注入、XSS、硬编码密钥等）2) 性能问题 3) 代码规范 4) 错误处理 5) 可维护性。对每个问题给出严重级别（严重/警告/建议）和具体修复方案。',
    input_template: '请审查以下代码：\n\n```\n{{input}}\n```',
    output_format: '使用 Markdown 格式输出审查报告，按严重级别排序。每个问题包含：问题描述、所在位置、修复建议、修复后的代码片段。',
    model: 'deepseek-r1',
    temperature: 0.2,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['审查', '质量', '安全'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-data-analysis',
    name: '数据分析',
    description: '分析数据集，发现模式、异常和趋势',
    icon: 'BarChart3',
    category: 'analysis',
    system_prompt: '你是一个数据分析专家。用户会提供数据或描述分析需求，你需要：1) 理解数据结构和含义 2) 选择合适的分析方法 3) 发现数据中的模式、趋势和异常 4) 用可视化建议辅助说明 5) 给出可执行的结论和建议。',
    input_template: '分析需求：\n{{input}}',
    output_format: '使用 Markdown 格式，包含：分析目标、数据概况、关键发现（用表格和列表）、趋势分析、异常检测、结论和建议。如需可视化，说明推荐的图表类型。',
    model: 'deepseek-v3',
    temperature: 0.4,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['分析', '数据', '可视化'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-content-write',
    name: '内容创作',
    description: '生成文章、报告、文案等各类内容',
    icon: 'PenTool',
    category: 'content',
    system_prompt: '你是一个专业的内容创作者。根据用户需求生成高质量内容。要求：1) 结构清晰，逻辑严谨 2) 语言流畅，符合目标受众 3) 内容有价值，避免空洞 4) 适当使用标题、列表等格式增强可读性。',
    input_template: '请创作以下内容：\n\n主题：{{input}}',
    output_format: '使用 Markdown 格式输出完整内容。包含清晰的标题层级、适当的小标题、必要的列表和强调。',
    model: 'deepseek-v3',
    temperature: 0.7,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['写作', '文章', '创作'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-translate',
    name: '专业翻译',
    description: '高质量多语言翻译，保留原文风格和语境',
    icon: 'Languages',
    category: 'content',
    system_prompt: '你是一个专业翻译。翻译时：1) 准确传达原文含义 2) 符合目标语言的表达习惯 3) 保留专业术语的准确性 4) 注意上下文语境和文化差异 5) 适当添加译注解释文化差异。',
    input_template: '请将以下内容翻译：\n\n{{input}}',
    output_format: '直接输出翻译结果。如有多处需要注释，在对应位置使用脚注格式标注。',
    model: 'deepseek-v3',
    temperature: 0.3,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['翻译', '多语言', '本地化'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-api-design',
    name: 'API 设计',
    description: '设计 RESTful API 接口，生成 OpenAPI 文档',
    icon: 'Link',
    category: 'developer',
    system_prompt: '你是一个 API 设计专家。根据用户需求设计 RESTful API：1) 遵循 REST 最佳实践 2) 合理的 URL 设计和 HTTP 方法 3) 完整的请求/响应格式 4) 错误处理规范 5) 认证和权限设计 6) 生成 OpenAPI 3.0 规范。',
    input_template: '请设计以下功能的 API 接口：\n\n{{input}}',
    output_format: '使用 Markdown 格式输出：API 概览、端点列表（表格形式）、每个端点的详细说明（URL、方法、参数、响应格式、示例）、认证方案、错误码说明。',
    model: 'deepseek-v3',
    temperature: 0.3,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['API', '接口', 'REST'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-test-gen',
    name: '测试生成',
    description: '根据代码或需求自动生成测试用例',
    icon: 'TestTube',
    category: 'developer',
    system_prompt: '你是一个测试工程师。根据用户提供的代码或需求描述生成测试用例：1) 覆盖正常路径和边界情况 2) 包含单元测试和集成测试 3) 使用主流测试框架 4) 测试代码清晰易读 5) 考虑错误场景和异常处理。',
    input_template: '请为以下内容生成测试：\n\n{{input}}',
    output_format: '使用对应语言的 markdown 代码块输出测试代码。代码前简要说明测试策略和覆盖范围。代码后列出未覆盖的场景和建议。',
    model: 'deepseek-v3',
    temperature: 0.3,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['测试', 'TDD', '质量保证'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
  {
    id: 'builtin-sql-helper',
    name: 'SQL 助手',
    description: '编写、优化和解释 SQL 查询',
    icon: 'Database',
    category: 'data',
    system_prompt: '你是一个数据库专家。帮助用户：1) 编写 SQL 查询 2) 优化慢查询 3) 解释复杂 SQL 的执行逻辑 4) 设计数据库表结构 5) 数据迁移方案。优先使用标准 SQL，需要时说明方言差异。',
    input_template: 'SQL 相关需求：\n\n{{input}}',
    output_format: '使用 markdown SQL 代码块输出 SQL 代码。代码前说明思路，代码后解释关键部分和注意事项。',
    model: 'deepseek-v3',
    temperature: 0.2,
    max_tokens: 4096,
    author: 'NexusFlow',
    version: '1.0.0',
    tags: ['SQL', '数据库', '查询优化'],
    is_builtin: true,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
  },
]

interface SkillState {
  skills: Skill[]
  selectedSkillId: string | null

  // 操作
  initializeSkills: () => void
  selectSkill: (id: string | null) => void
  addSkill: (data: SkillFormData) => Skill
  updateSkill: (id: string, data: Partial<SkillFormData>) => void
  deleteSkill: (id: string) => void
  getSkill: (id: string) => Skill | undefined
  getSkillsByCategory: (category: SkillCategory) => Skill[]
  applyTemplate: (skillId: string, variables: Record<string, string>) => string
}

function generateSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      skills: [],
      selectedSkillId: null,

      initializeSkills: () => {
        const current = get().skills
        // 如果已有数据，只补充缺失的内置 Skill
        if (current.length > 0) {
          const builtinIds = new Set(current.filter(s => s.is_builtin).map(s => s.id))
          const missing = BUILTIN_SKILLS.filter(s => !builtinIds.has(s.id))
          if (missing.length > 0) {
            set({ skills: [...missing, ...current] })
          }
          return
        }
        // 首次初始化，加载所有内置 Skill
        set({ skills: [...BUILTIN_SKILLS] })
      },

      selectSkill: (id) => set({ selectedSkillId: id }),

      addSkill: (data) => {
        const now = new Date().toISOString()
        const skill: Skill = {
          id: generateSkillId(),
          name: data.name,
          description: data.description,
          icon: data.icon,
          category: data.category,
          system_prompt: data.system_prompt,
          input_template: data.input_template,
          output_format: data.output_format,
          model: data.model,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          author: 'user',
          version: '1.0.0',
          tags: data.tags,
          is_builtin: false,
          created_at: now,
          updated_at: now,
        }
        set(state => ({ skills: [skill, ...state.skills] }))
        return skill
      },

      updateSkill: (id, data) => {
        set(state => ({
          skills: state.skills.map(s =>
            s.id === id
              ? { ...s, ...data, updated_at: new Date().toISOString() }
              : s
          )
        }))
      },

      deleteSkill: (id) => {
        // 内置 Skill 不允许删除
        const skill = get().skills.find(s => s.id === id)
        if (skill?.is_builtin) return
        set(state => ({
          skills: state.skills.filter(s => s.id !== id),
          selectedSkillId: state.selectedSkillId === id ? null : state.selectedSkillId,
        }))
      },

      getSkill: (id) => get().skills.find(s => s.id === id),

      getSkillsByCategory: (category) => get().skills.filter(s => s.category === category),

      applyTemplate: (skillId, variables) => {
        const skill = get().getSkill(skillId)
        if (!skill) return ''
        let template = skill.input_template
        for (const [key, value] of Object.entries(variables)) {
          template = template.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
        }
        return template
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        skills: state.skills,
      }),
    }
  )
)
