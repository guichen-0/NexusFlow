import { useEffect, useState } from 'react'
import {
  Code2, PenTool, BarChart3, Database, SearchCode, Link,
  Languages, TestTube, Cpu, Plus, Trash2, X, ChevronDown,
  Sparkles, Tag, Settings2
} from 'lucide-react'
import { useSkillStore } from '../stores/skillStore'
import { Skill, SkillCategory, SKILL_CATEGORY_LABELS, SkillFormData } from '../types/skill'

const categoryIcons: Record<SkillCategory, typeof Code2> = {
  developer: Code2,
  content: PenTool,
  data: Database,
  analysis: BarChart3,
  automation: Cpu,
}

const categoryColors: Record<SkillCategory, string> = {
  developer: '#378ADD',
  content: '#D4537E',
  data: '#0F6E56',
  analysis: '#BA7517',
  automation: '#534AB7',
}

const availableIcons = [
  'Code2', 'PenTool', 'BarChart3', 'Database', 'SearchCode',
  'Link', 'Languages', 'TestTube', 'Cpu', 'Sparkles', 'Settings2', 'Tag',
]

const defaultFormData: SkillFormData = {
  name: '',
  description: '',
  icon: 'Cpu',
  category: 'developer',
  system_prompt: '',
  input_template: '{{input}}',
  output_format: '',
  model: 'deepseek-v3',
  temperature: 0.5,
  max_tokens: 4096,
  tags: [],
}

export default function Skills() {
  const { skills, initializeSkills, addSkill, updateSkill, deleteSkill } = useSkillStore()
  const [showEditor, setShowEditor] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [formData, setFormData] = useState<SkillFormData>(defaultFormData)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all')

  useEffect(() => {
    initializeSkills()
  }, [])

  const filteredSkills = activeCategory === 'all'
    ? skills
    : skills.filter(s => s.category === activeCategory)

  const openCreateEditor = () => {
    setEditingSkill(null)
    setFormData(defaultFormData)
    setShowEditor(true)
  }

  const openEditEditor = (skill: Skill) => {
    setEditingSkill(skill)
    setFormData({
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      category: skill.category,
      system_prompt: skill.system_prompt,
      input_template: skill.input_template,
      output_format: skill.output_format,
      model: skill.model,
      temperature: skill.temperature ?? 0.5,
      max_tokens: skill.max_tokens ?? 4096,
      tags: [...skill.tags],
    })
    setShowEditor(true)
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.system_prompt.trim()) return
    if (editingSkill) {
      updateSkill(editingSkill.id, formData)
    } else {
      addSkill(formData)
    }
    setShowEditor(false)
    setEditingSkill(null)
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, typeof Code2> = {
      Code2, PenTool, BarChart3, Database, SearchCode,
      Link, Languages, TestTube, Cpu, Sparkles, Settings2, Tag,
    }
    return icons[iconName] || Cpu
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Skills</h1>
          <p className="text-text-secondary mt-1">
            受约束的 AI 能力单元 — 定义专业技能，编排为工作流
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
            {skills.length} 个 Skills
          </div>
          <button
            onClick={openCreateEditor}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建 Skill
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
          }`}
        >
          全部
        </button>
        {(Object.entries(SKILL_CATEGORY_LABELS) as [SkillCategory, string][]).map(([key, label]) => {
          const Icon = categoryIcons[key]
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
                activeCategory === key
                  ? 'bg-primary text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map(skill => {
          const Icon = getIconComponent(skill.icon)
          const color = categoryColors[skill.category]
          const isExpanded = expandedSkill === skill.id

          return (
            <div
              key={skill.id}
              className="bg-surface-primary border border-border-tertiary rounded-xl overflow-hidden hover:border-border-secondary transition-colors"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text-primary truncate">{skill.name}</h3>
                        {skill.is_builtin && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
                            内置
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-text-tertiary transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span
                    className="px-2 py-0.5 text-[11px] rounded-full"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {SKILL_CATEGORY_LABELS[skill.category]}
                  </span>
                  <span className="px-2 py-0.5 text-[11px] bg-surface-tertiary text-text-tertiary rounded-full">
                    {skill.model}
                  </span>
                  {skill.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[11px] bg-surface-tertiary text-text-tertiary rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border-tertiary pt-3">
                  <div>
                    <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">System Prompt</label>
                    <pre className="mt-1 p-2 bg-surface-tertiary rounded-lg text-xs text-text-secondary overflow-auto max-h-32 whitespace-pre-wrap font-mono">
                      {skill.system_prompt}
                    </pre>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Input Template</label>
                    <pre className="mt-1 p-2 bg-surface-tertiary rounded-lg text-xs text-text-secondary overflow-auto max-h-20 whitespace-pre-wrap font-mono">
                      {skill.input_template}
                    </pre>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
                    <span>temperature: {skill.temperature}</span>
                    <span>max_tokens: {skill.max_tokens}</span>
                    <span>v{skill.version}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditEditor(skill) }}
                      className="flex-1 px-3 py-1.5 text-sm bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-tertiary transition-colors text-center"
                    >
                      编辑
                    </button>
                    {!skill.is_builtin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSkill(skill.id) }}
                        className="px-3 py-1.5 text-sm text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Skill Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-primary border border-border-tertiary rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border-tertiary">
              <h2 className="text-lg font-bold text-text-primary">
                {editingSkill ? '编辑 Skill' : '新建 Skill'}
              </h2>
              <button
                onClick={() => { setShowEditor(false); setEditingSkill(null) }}
                className="p-1 hover:bg-surface-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：代码生成"
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">分类</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as SkillCategory }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  >
                    {(Object.entries(SKILL_CATEGORY_LABELS) as [SkillCategory, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="一句话描述这个 Skill 的能力"
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">图标</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableIcons.map(iconName => {
                    const Icon = getIconComponent(iconName)
                    return (
                      <button
                        key={iconName}
                        onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          formData.icon === iconName
                            ? 'bg-primary text-white'
                            : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">System Prompt</label>
                <textarea
                  value={formData.system_prompt}
                  onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  placeholder="定义 AI 的角色、行为约束和专业能力..."
                  rows={5}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary resize-y font-mono"
                />
              </div>

              {/* Input Template */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  输入模板 <span className="text-text-tertiary text-xs">（支持 {'{{variable}}'} 占位符）</span>
                </label>
                <textarea
                  value={formData.input_template}
                  onChange={e => setFormData(prev => ({ ...prev, input_template: e.target.value }))}
                  placeholder={'例如：请分析以下代码：\n\n{{input}}'}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary resize-y font-mono"
                />
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">输出格式要求</label>
                <textarea
                  value={formData.output_format}
                  onChange={e => setFormData(prev => ({ ...prev, output_format: e.target.value }))}
                  placeholder="描述期望的输出格式..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary resize-y"
                />
              </div>

              {/* Model + Temperature */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">模型</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Temperature</label>
                  <input
                    type="number"
                    min="0" max="2" step="0.1"
                    value={formData.temperature}
                    onChange={e => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="256" max="32768" step="256"
                    value={formData.max_tokens}
                    onChange={e => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))}
                    className="w-full px-3 py-2 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">标签</label>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-surface-tertiary text-text-secondary rounded-full text-xs">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-text-primary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="输入标签后回车"
                    className="flex-1 px-3 py-1.5 bg-surface-secondary border border-border-tertiary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-1.5 bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-tertiary transition-colors text-sm"
                  >
                    添加
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border-tertiary">
              <button
                onClick={() => { setShowEditor(false); setEditingSkill(null) }}
                className="px-4 py-2 text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.system_prompt.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingSkill ? '保存修改' : '创建 Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
