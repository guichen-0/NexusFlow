import { useState, useRef, type FormEvent, useCallback, useEffect } from 'react'
import { Send, Paperclip, X, FileText, Image, AlertCircle, Brain, Users, Sparkles, ChevronDown } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSkillStore } from '../../stores/skillStore'
import { useChatStore } from '../../stores/chatStore'
import { SKILL_CATEGORY_LABELS, type SkillCategory } from '../../types/skill'

interface UploadedFile {
  name: string
  type: 'text' | 'image' | 'error'
  content?: string
  path?: string
  size: number
  mime?: string
  error?: string
  preview?: string
}

interface ChatInputProps {
  onSend: (message: string, files?: UploadedFile[], messageSkillId?: string | null) => void
  isLoading: boolean
  agentMode: boolean
  onToggleAgentMode: (enabled: boolean) => void
}

const ACCEPT_TYPES = '.txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.yaml,.yml,.toml,.csv,.xml,.html,.css,.sql,.sh,.vue,.svelte,.rs,.go,.java,.c,.cpp,.h,.rb,.php,.swift,.kt,.png,.jpg,.jpeg,.gif,.webp,.svg,.env,.gitignore,.dockerignore,.cfg,.ini'

const CATEGORY_ORDER: SkillCategory[] = ['developer', 'code', 'design', 'content', 'analysis', 'research', 'automation', 'data', 'docs']

export default function ChatInput({ onSend, isLoading, agentMode, onToggleAgentMode }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [messageSkillId, setMessageSkillId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skillPickerRef = useRef<HTMLDivElement>(null)
  const { thinkingMode, setThinkingMode } = useSettingsStore()
  const { activeSkillId, setActiveSkill } = useChatStore()
  const { skills, getSkill, globalSkillIds } = useSkillStore()

  // 关闭 skill picker 点击外部
  useEffect(() => {
    if (!showSkillPicker) return
    const handler = (e: MouseEvent) => {
      if (skillPickerRef.current && !skillPickerRef.current.contains(e.target as Node)) {
        setShowSkillPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSkillPicker])

  const uploadFiles = async (fileList: FileList | File[]): Promise<UploadedFile[]> => {
    const formData = new FormData()
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i])
    }

    setIsUploading(true)
    try {
      const resp = await fetch('/api/backend/v1/chat/upload', {
        method: 'POST',
        body: formData,
      })
      if (!resp.ok) throw new Error(`上传失败 (${resp.status})`)
      const data = await resp.json()
      return data.files || []
    } catch (e: any) {
      return [{ name: 'upload-error', type: 'error', error: e.message, size: 0 }]
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const uploaded = await uploadFiles(files)
    setAttachedFiles(prev => [...prev, ...uploaded])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length === 0) return
    const uploaded = await uploadFiles(files)
    setAttachedFiles(prev => [...prev, ...uploaded])
  }, [])

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if ((!trimmed && attachedFiles.length === 0) || isLoading) return
    onSend(trimmed || '(文件附件)', attachedFiles.length > 0 ? attachedFiles : undefined, messageSkillId)
    setInput('')
    setAttachedFiles([])
    setMessageSkillId(null) // 消息级 skill 发完即失效
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleSelectSessionSkill = (id: string | null) => {
    setActiveSkill(id)
    setShowSkillPicker(false)
  }

  const handleSelectMessageSkill = (id: string) => {
    setMessageSkillId(prev => prev === id ? null : id)
    setShowSkillPicker(false)
  }

  // 获取可选 skill（排除全局 skill）
  const optionalSkills = skills.filter(s => !globalSkillIds.includes(s.id))
  const groupedSkills = CATEGORY_ORDER
    .map(cat => ({ category: cat, skills: optionalSkills.filter(s => s.category === cat) }))
    .filter(g => g.skills.length > 0)

  const activeSessionSkill = activeSkillId ? getSkill(activeSkillId) : null
  const activeMessageSkill = messageSkillId ? getSkill(messageSkillId) : null
  const hasContent = input.trim() || attachedFiles.length > 0

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-3 border-t border-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽提示覆盖层 */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary/50 bg-surface-2/80">
            <Paperclip className="w-8 h-8 text-primary" />
            <span className="text-sm text-text-secondary">松开以上传文件</span>
          </div>
        </div>
      )}

      {/* 已附加文件预览 */}
      {attachedFiles.length > 0 && (
        <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
                file.type === 'error'
                  ? 'border-danger/30 bg-danger/5 text-danger'
                  : file.type === 'image'
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-border bg-surface-2 text-text-secondary'
              }`}
            >
              {file.type === 'error' ? (
                <AlertCircle className="w-3 h-3 shrink-0" />
              ) : file.type === 'image' ? (
                <Image className="w-3 h-3 shrink-0" />
              ) : (
                <FileText className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate max-w-[120px]" title={file.error || file.name}>
                {file.name}
              </span>
              {file.type !== 'error' && (
                <span className="text-text-muted">({Math.round(file.size / 1024)}KB)</span>
              )}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="ml-0.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 活跃 Skill 标签 */}
      {(activeSessionSkill || activeMessageSkill) && (
        <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 flex-wrap">
          {activeSessionSkill && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary">
              <Sparkles className="w-3 h-3" />
              会话: {activeSessionSkill.name}
              <button type="button" onClick={() => setActiveSkill(null)} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeMessageSkill && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent">
              <Sparkles className="w-3 h-3" />
              单条: {activeMessageSkill.name}
              <button type="button" onClick={() => setMessageSkillId(null)} className="hover:text-accent/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Agent 模式提示 */}
      {agentMode && (
        <div className="max-w-3xl mx-auto mb-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-xs text-accent">Agent 模式已开启 — 消息将由 AI 团队协作处理（5 个 Agent 流水线）</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto flex items-end gap-3">
        {/* 附件按钮 */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-11 h-11 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-secondary hover:border-border-2 transition-colors disabled:opacity-50 shrink-0"
          title="添加文件"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Agent 模式开关 */}
        <button
          type="button"
          onClick={() => onToggleAgentMode(!agentMode)}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
            agentMode
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-surface-2 border-border text-text-muted hover:text-text-secondary hover:border-border-2'
          }`}
          title={agentMode ? 'Agent 模式已开启' : '开启 Agent 团队模式'}
        >
          <Users className="w-4 h-4" />
        </button>

        {/* 深度思考模式开关 */}
        <button
          type="button"
          onClick={() => setThinkingMode(!thinkingMode)}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
            thinkingMode
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
              : 'bg-surface-2 border-border text-text-muted hover:text-text-secondary hover:border-border-2'
          }`}
          title={thinkingMode ? '深度思考模式已开启' : '开启深度思考模式'}
        >
          <Brain className="w-4 h-4" />
        </button>

        {/* Skill 选择器 */}
        <div className="relative" ref={skillPickerRef}>
          <button
            type="button"
            onClick={() => setShowSkillPicker(!showSkillPicker)}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
              activeSessionSkill || activeMessageSkill
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface-2 border-border text-text-muted hover:text-text-secondary hover:border-border-2'
            }`}
            title="选择 Skill"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Skill 下拉面板 */}
          {showSkillPicker && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl z-50">
              <div className="p-2 border-b border-border">
                <p className="text-[11px] text-text-muted px-2 py-1">会话级 Skill（整个会话生效）</p>
                <button
                  type="button"
                  onClick={() => handleSelectSessionSkill(null)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    !activeSkillId ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-2'
                  }`}
                >
                  不使用
                </button>
                {skills.filter(s => s.scope === 'session' || s.scope === 'global').slice(0, 6).map(skill => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSelectSessionSkill(skill.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                      activeSkillId === skill.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    <span className="truncate">{skill.name}</span>
                    <span className="ml-auto text-[10px] text-text-muted shrink-0">{SKILL_CATEGORY_LABELS[skill.category]}</span>
                  </button>
                ))}
              </div>
              <div className="p-2">
                <p className="text-[11px] text-text-muted px-2 py-1">消息级 Skill（单条消息生效）</p>
                {groupedSkills.map(group => (
                  <div key={group.category}>
                    <p className="text-[10px] text-text-muted px-2 pt-1.5 pb-0.5 font-medium">{SKILL_CATEGORY_LABELS[group.category]}</p>
                    {group.skills.map(skill => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSelectMessageSkill(skill.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          messageSkillId === skill.id ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-2'
                        }`}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={agentMode ? '描述任务，AI 团队将协作完成... Shift+Enter 换行' : '输入消息... Shift+Enter 换行'}
            rows={1}
            className="w-full px-4 py-3 pr-12 bg-surface-2 border border-border rounded-2xl text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/50 max-h-[200px]"
          />
        </div>
        <button
          type="submit"
          disabled={!hasContent || isLoading}
          className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
