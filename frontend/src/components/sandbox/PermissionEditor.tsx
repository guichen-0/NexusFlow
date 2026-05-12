import { useState } from 'react'
import { Check } from 'lucide-react'
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
    setAllowedLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }

  const handleSave = () => {
    if (!name.trim()) return
    const data: Record<string, any> = {
      name: name.trim(), description: description.trim(),
      allow_network: allowNetwork, allow_filesystem: allowFilesystem,
      allow_subprocess: allowSubprocess, allow_env_vars: allowEnvVars, allow_terminal: allowTerminal,
      max_timeout: maxTimeout, max_memory_mb: maxMemoryMb, max_output_size: 1000000,
      allow_imports: allowImports.split(',').map(s => s.trim()).filter(Boolean),
      deny_imports: denyImports.split(',').map(s => s.trim()).filter(Boolean),
      allowed_languages: allowedLangs,
    }
    if (isEditing && !isCopyFromBuiltin) { onSave(data) } else { delete (data as any).is_builtin; delete (data as any).id; onSave(data) }
  }

  const ToggleSwitch = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-10 h-[22px] rounded-full transition-all duration-300 relative ${value ? 'bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/20' : 'bg-surface-3'}`}>
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
      </button>
    </div>
  )

  const isEditing = !!permission
  const title = isCopyFromBuiltin ? `基于「${permission?.name}」创建副本` : isEditing ? '编辑权限模板' : '新建权限模板'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in">
      <div className="bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl shadow-black/30 animate-in">
        <div className="px-5 py-4 border-b border-border/40">
          <h3 className="text-base font-bold gradient-text">{title}</h3>
          {isCopyFromBuiltin && <p className="text-xs text-text-muted mt-1">将基于内置模板创建一个可自由编辑的自定义副本</p>}
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5 font-medium">名称 *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" placeholder="如：数据分析模式" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5 font-medium">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none transition-all duration-200" rows={2} placeholder="描述此权限模板的用途..." />
          </div>

          <div>
            <span className="block text-xs text-text-muted mb-2 font-medium">能力开关</span>
            <div className="bg-surface-2/30 rounded-xl p-3 border border-border/30 space-y-1">
              <ToggleSwitch value={allowNetwork} onChange={setAllowNetwork} label="允许联网" />
              <ToggleSwitch value={allowFilesystem} onChange={setAllowFilesystem} label="允许文件读写" />
              <ToggleSwitch value={allowSubprocess} onChange={setAllowSubprocess} label="允许子进程" />
              <ToggleSwitch value={allowTerminal} onChange={setAllowTerminal} label="允许终端命令" />
              <ToggleSwitch value={allowEnvVars} onChange={setAllowEnvVars} label="允许读取环境变量" />
            </div>
          </div>

          <div>
            <span className="block text-xs text-text-muted mb-2 font-medium">允许的语言</span>
            <div className="flex gap-2">
              {['python', 'javascript', 'typescript'].map(lang => (
                <button key={lang} onClick={() => toggleLang(lang)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${allowedLangs.includes(lang) ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20' : 'bg-surface-2/60 text-text-muted hover:text-text-secondary border border-border/30'}`}>
                  {allowedLangs.includes(lang) && <Check className="w-3 h-3" />}
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">最大超时（秒）</label>
              <input type="number" value={maxTimeout} onChange={(e) => setMaxTimeout(Number(e.target.value))} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" min={1} max={300} />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">内存限制（MB）</label>
              <input type="number" value={maxMemoryMb} onChange={(e) => setMaxMemoryMb(Number(e.target.value))} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" min={16} max={4096} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5 font-medium">允许导入的模块（逗号分隔，空=全部）</label>
            <input value={allowImports} onChange={(e) => setAllowImports(e.target.value)} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" placeholder="pandas, numpy, matplotlib" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5 font-medium">禁止导入的模块（逗号分隔）</label>
            <input value={denyImports} onChange={(e) => setDenyImports(e.target.value)} className="w-full bg-surface-2/60 border border-border/40 rounded-xl px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" placeholder="subprocess, os, sys" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border/40">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all duration-200">取消</button>
          <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 transition-all duration-200">
            {isCopyFromBuiltin ? '创建副本' : isEditing ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  )
}
