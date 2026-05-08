import { useState } from 'react'
import type { Permission } from '../../types/sandbox'

interface PermissionEditorProps {
  permission?: Permission | null
  isCopyFromBuiltin?: boolean
  onSave: (data: Partial<Permission>) => void
  onCancel: () => void
}

export default function PermissionEditor({ permission, isCopyFromBuiltin = false, onSave, onCancel }: PermissionEditorProps) {
  const [name, setName] = useState(permission?.name || '')
  const [description, setDescription] = useState(permission?.description || '')
  const [allowNetwork, setAllowNetwork] = useState(permission?.allow_network ?? false)
  const [allowFilesystem, setAllowFilesystem] = useState(permission?.allow_filesystem ?? true)
  const [allowSubprocess, setAllowSubprocess] = useState(permission?.allow_subprocess ?? false)
  const [allowEnvVars, setAllowEnvVars] = useState(permission?.allow_env_vars ?? false)
  const [allowTerminal, setAllowTerminal] = useState(permission?.allow_terminal ?? false)
  const [maxTimeout, setMaxTimeout] = useState(permission?.max_timeout ?? 30)
  const [maxMemoryMb, setMaxMemoryMb] = useState(permission?.max_memory_mb ?? 512)
  const [allowImports, setAllowImports] = useState(permission?.allow_imports?.join(', ') || '')
  const [denyImports, setDenyImports] = useState(permission?.deny_imports?.join(', ') || '')
  const [allowedLangs, setAllowedLangs] = useState<string[]>(permission?.allowed_languages || ['python', 'javascript', 'typescript'])

  const toggleLang = (lang: string) => {
    setAllowedLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const handleSave = () => {
    if (!name.trim()) return
    const data: Record<string, any> = {
      name: name.trim(),
      description: description.trim(),
      allow_network: allowNetwork,
      allow_filesystem: allowFilesystem,
      allow_subprocess: allowSubprocess,
      allow_env_vars: allowEnvVars,
      allow_terminal: allowTerminal,
      max_timeout: maxTimeout,
      max_memory_mb: maxMemoryMb,
      max_output_size: 1000000,
      allow_imports: allowImports.split(',').map(s => s.trim()).filter(Boolean),
      deny_imports: denyImports.split(',').map(s => s.trim()).filter(Boolean),
      allowed_languages: allowedLangs,
    }
    // 新建时不传 id 和 is_builtin，让后端自动处理
    if (isEditing && !isCopyFromBuiltin) {
      onSave(data)
    } else {
      delete (data as any).is_builtin
      delete (data as any).id
      onSave(data)
    }
  }

  const ToggleSwitch = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          value ? 'bg-primary' : 'bg-surface-tertiary'
        }`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  )

  const isEditing = !!permission
  const title = isCopyFromBuiltin
    ? `基于「${permission?.name}」创建副本`
    : isEditing ? '编辑权限模板' : '新建权限模板'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-border-secondary rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-border-secondary">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {isCopyFromBuiltin && (
            <p className="text-xs text-text-muted mt-1">将基于内置模板创建一个可自由编辑的自定义副本</p>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 基本信息 */}
          <div>
            <label className="block text-xs text-text-muted mb-1">名称 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
              placeholder="如：数据分析模式"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="描述此权限模板的用途..."
            />
          </div>

          {/* 能力开关 */}
          <div>
            <span className="block text-xs text-text-muted mb-2">能力开关</span>
            <div className="space-y-2">
              <ToggleSwitch value={allowNetwork} onChange={setAllowNetwork} label="允许联网" />
              <ToggleSwitch value={allowFilesystem} onChange={setAllowFilesystem} label="允许文件读写" />
              <ToggleSwitch value={allowSubprocess} onChange={setAllowSubprocess} label="允许子进程" />
              <ToggleSwitch value={allowTerminal} onChange={setAllowTerminal} label="允许终端命令" />
              <ToggleSwitch value={allowEnvVars} onChange={setAllowEnvVars} label="允许读取环境变量" />
            </div>
          </div>

          {/* 允许的语言 */}
          <div>
            <span className="block text-xs text-text-muted mb-2">允许的语言</span>
            <div className="flex gap-2">
              {['python', 'javascript', 'typescript'].map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLang(lang)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                    allowedLangs.includes(lang)
                      ? 'bg-primary text-white'
                      : 'bg-surface-2 text-text-tertiary'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* 资源限制 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">最大超时（秒）</label>
              <input
                type="number"
                value={maxTimeout}
                onChange={(e) => setMaxTimeout(Number(e.target.value))}
                className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                min={1}
                max={300}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">内存限制（MB）</label>
              <input
                type="number"
                value={maxMemoryMb}
                onChange={(e) => setMaxMemoryMb(Number(e.target.value))}
                className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                min={16}
                max={4096}
              />
            </div>
          </div>

          {/* 模块控制 */}
          <div>
            <label className="block text-xs text-text-muted mb-1">允许导入的模块（逗号分隔，空=全部）</label>
            <input
              value={allowImports}
              onChange={(e) => setAllowImports(e.target.value)}
              className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary"
              placeholder="pandas, numpy, matplotlib"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">禁止导入的模块（逗号分隔）</label>
            <input
              value={denyImports}
              onChange={(e) => setDenyImports(e.target.value)}
              className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary"
              placeholder="subprocess, os, sys"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-secondary">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-2 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isCopyFromBuiltin ? '创建副本' : isEditing ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
