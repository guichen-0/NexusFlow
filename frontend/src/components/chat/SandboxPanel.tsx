import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Terminal, Play, Plus, Trash2, FileText, FolderOpen,
  X, Copy, Check, RefreshCw, Code2, AlertTriangle, Shield, Square,
  FolderUp, HardDrive,
} from 'lucide-react'
import { useSandboxStore } from '../../stores/sandboxStore'

const LANGUAGES = [
  { id: 'python', label: 'Python', color: 'from-green-500 to-emerald-600' },
  { id: 'javascript', label: 'JS', color: 'from-yellow-500 to-amber-600' },
]

const TERMINAL_HINTS = ['dir', 'ls', 'echo "hello"', 'python --version', 'pip list']

export default function SandboxPanel() {
  const {
    workspaces, activeWorkspaceId, executions, permissions,
    isExecuting, lastResult, panelOpen, activeTab,
    togglePanel, setActiveTab, setActiveWorkspace, createWorkspace, deleteWorkspace,
    refreshWorkspace, executeCode, executeTerminal, readFile, writeFile, deleteFile,
    fetchPermissions,
  } = useSandboxStore()

  const [code, setCode] = useState('print("Hello from NexusFlow!")')
  const [language, setLanguage] = useState('python')
  const [selectedPerm, setSelectedPerm] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [termInput, setTermInput] = useState('')
  const [termHistory, setTermHistory] = useState<string[]>([])
  const [termHistoryIdx, setTermHistoryIdx] = useState(-1)
  const termInputRef = useRef<HTMLInputElement>(null)
  const [showNewWsMenu, setShowNewWsMenu] = useState(false)
  const wsMenuRef = useRef<HTMLDivElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const currentPerm = permissions.find(p => p.id === selectedPerm)
  const canUseTerminal = !currentPerm || currentPerm.allow_terminal

  useEffect(() => { fetchPermissions().catch(() => {}) }, [])
  useEffect(() => { if (activeWorkspaceId) refreshWorkspace(activeWorkspaceId).catch(() => {}) }, [activeWorkspaceId])

  const handleRun = async () => {
    setError(''); if (!code.trim()) return
    try {
      if (!activeWorkspaceId) await createWorkspace({ permissionId: selectedPerm || undefined, type: 'virtual' })
      await executeCode(code, language, { permissionId: selectedPerm || undefined })
    } catch (e: any) { setError(e.message) }
  }

  const handleRunTerminal = async () => {
    const cmd = termInput.trim(); if (!cmd) return
    setError(''); setTermHistory(prev => [...prev, cmd]); setTermHistoryIdx(-1); setTermInput('')
    try {
      if (!activeWorkspaceId) await createWorkspace({ permissionId: selectedPerm || undefined, type: 'virtual' })
      await executeTerminal(cmd, { permissionId: selectedPerm || undefined })
    } catch (e: any) { setError(e.message) }
  }

  const handleTermKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault(); const nextIdx = termHistoryIdx < termHistory.length - 1 ? termHistoryIdx + 1 : termHistoryIdx
      setTermHistoryIdx(nextIdx); if (nextIdx >= 0) setTermInput(termHistory[termHistory.length - 1 - nextIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); const nextIdx = termHistoryIdx > 0 ? termHistoryIdx - 1 : -1
      setTermHistoryIdx(nextIdx); if (nextIdx >= 0) setTermInput(termHistory[termHistory.length - 1 - nextIdx]); else setTermInput('')
    } else if (e.key === 'Enter' && !e.shiftKey) { handleRunTerminal() }
  }, [termInput, termHistory, termHistoryIdx])

  const handleFileClick = async (filePath: string) => {
    if (!activeWorkspaceId || !activeWorkspace) return
    if (activeWorkspace.files.some(f => f.startsWith(filePath + '/') || f.startsWith(filePath + '\\'))) {
      setExpandedDirs(prev => { const next = new Set(prev); if (next.has(filePath)) next.delete(filePath); else next.add(filePath); return next }); return
    }
    setPreviewFile(filePath)
    try { const content = await readFile(activeWorkspaceId, filePath); setPreviewContent(content) } catch { setPreviewContent('(无法读取)') }
  }

  const handleNewFile = async () => {
    if (!newFileName.trim() || !activeWorkspaceId) return
    try { await writeFile(activeWorkspaceId, newFileName.trim(), ''); setNewFileName(''); setShowNewFile(false); refreshWorkspace(activeWorkspaceId).catch(() => {}) } catch (e: any) { setError(e.message) }
  }

  const handleDeleteFile = async (filePath: string) => {
    if (!activeWorkspaceId) return
    try { await deleteFile(activeWorkspaceId, filePath); if (previewFile === filePath) { setPreviewFile(null); setPreviewContent('') }; refreshWorkspace(activeWorkspaceId).catch(() => {}) } catch (e: any) { setError(e.message) }
  }

  const handleCopyResult = () => {
    if (lastResult) { navigator.clipboard.writeText(lastResult.stdout || lastResult.stderr || ''); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleCreateVirtual = async () => {
    setError(''); setShowNewWsMenu(false)
    try { await createWorkspace({ permissionId: selectedPerm || undefined, type: 'virtual' }) } catch (e: any) { setError(e.message) }
  }

  const handleDirSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const relPath = (file as any).webkitRelativePath || file.name
    const dirName = relPath.split('/')[0]
    setError(''); setShowNewWsMenu(false)
    try { await createWorkspace({ permissionId: selectedPerm || undefined, type: 'local', path: dirName }) } catch (err: any) { setError(err.message) }
    e.target.value = ''
  }

  // Close menu on outside click
  useEffect(() => {
    if (!showNewWsMenu) return
    const handleClick = (e: MouseEvent) => { if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) setShowNewWsMenu(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNewWsMenu])

  if (!panelOpen) return null

  return (
    <div className="w-96 h-full border-l border-border/40 flex flex-col glass overflow-hidden shrink-0">
      {/* Header — glass */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 bg-surface/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-text-primary">沙箱</span>
          {currentPerm && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">{currentPerm.name}</span>}
        </div>
        <button onClick={togglePanel} className="text-text-muted hover:text-text-secondary p-1 rounded-lg hover:bg-surface-2 transition-all duration-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Workspace + Permission */}
      <div className="px-3 py-2 border-b border-border/40 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <select value={activeWorkspaceId || ''} onChange={(e) => setActiveWorkspace(e.target.value || null)} className="flex-1 bg-surface-2/60 border border-border/40 rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-all duration-200">
            <option value="">选择工作空间...</option>
            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.type === 'local' ? ws.path.split(/[/\\]/).pop() : ws.id.slice(0, 8)} ({ws.type === 'local' ? '本地' : '虚拟'})</option>)}
          </select>
          <div className="relative" ref={wsMenuRef}>
            <button onClick={() => setShowNewWsMenu(!showNewWsMenu)} disabled={isExecuting} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:shadow-md hover:shadow-primary/20 disabled:opacity-50 transition-all duration-200" title="新建">
              <Plus className="w-3.5 h-3.5" />
            </button>
            {showNewWsMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl shadow-black/30 z-50 py-1 animate-in">
                <button onClick={handleCreateVirtual} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors text-left">
                  <FolderOpen className="w-4 h-4 text-warning shrink-0" />
                  <div>
                    <div className="font-medium">虚拟空间</div>
                    <div className="text-[10px] text-text-muted">临时目录</div>
                  </div>
                </button>
                <button onClick={() => { dirInputRef.current?.click() }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors text-left">
                  <FolderUp className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">本地目录</div>
                    <div className="text-[10px] text-text-muted">挂载本地文件夹</div>
                  </div>
                </button>
                <input ref={dirInputRef} type="file" onChange={handleDirSelect} className="hidden" {...{ webkitdirectory: '' } as any} />
              </div>
            )}
          </div>
        </div>
        {permissions.length > 0 && (
          <select value={selectedPerm} onChange={(e) => setSelectedPerm(e.target.value)} className="w-full bg-surface-2/60 border border-border/40 rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-primary transition-all duration-200">
            <option value="">权限: 默认</option>
            {permissions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Tabs — pill style */}
      <div className="flex border-b border-border/40 px-2 pt-1.5">
        {(['code', 'terminal'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-t-lg transition-all duration-200 ${activeTab === tab ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2/50'}`}>
            {tab === 'code' ? <Code2 className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
            {tab === 'code' ? '代码' : '终端'}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-1.5 bg-danger/10 border-b border-danger/20 flex items-center gap-1.5 animate-in">
          <AlertTriangle className="w-3 h-3 text-danger shrink-0" />
          <span className="text-xs text-danger flex-1 truncate">{error}</span>
          <button onClick={() => setError('')} className="text-danger/60 hover:text-danger"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Code tab */}
        {activeTab === 'code' && (
          <div className="flex flex-col h-full">
            {activeWorkspace && activeWorkspace.files.length > 0 && (
              <div className="px-3 py-2 border-b border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-text-muted">文件</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => setShowNewFile(!showNewFile)} className="p-0.5 text-primary hover:bg-primary/10 rounded transition-all"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => refreshWorkspace(activeWorkspace.id)} className="p-0.5 text-text-muted hover:text-text-secondary rounded transition-all"><RefreshCw className="w-3 h-3" /></button>
                  </div>
                </div>
                {showNewFile && (
                  <div className="flex gap-1 mb-1 animate-in">
                    <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNewFile()} placeholder="filename.py" className="flex-1 bg-surface-2/60 border border-border/40 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary transition-all" autoFocus />
                    <button onClick={handleNewFile} className="text-xs text-primary font-medium px-1.5">OK</button>
                  </div>
                )}
                <div className="max-h-24 overflow-y-auto">
                  {activeWorkspace.files.map(f => {
                    const name = f.split(/[/\\]/).pop() || f
                    return (
                      <div key={f} onClick={() => handleFileClick(f)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs cursor-pointer transition-all duration-150 group ${previewFile === f ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-surface-2/80'}`}>
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate flex-1">{name}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(f) }} className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {previewFile && (
              <div className="px-3 py-2 border-b border-border/40 animate-in">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-muted font-mono truncate">{previewFile}</span>
                  <button onClick={() => setPreviewFile(null)} className="text-text-muted hover:text-text-secondary"><X className="w-3 h-3" /></button>
                </div>
                <pre className="bg-surface-2/50 rounded-lg p-2 text-xs font-mono text-text-secondary overflow-auto max-h-20 whitespace-pre-wrap border border-border/30">{previewContent}</pre>
              </div>
            )}

            <div className="px-3 py-2 border-b border-border/40">
              <div className="flex gap-1 mb-1.5">
                {LANGUAGES.map(lang => (
                  <button key={lang.id} onClick={() => setLanguage(lang.id)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${language === lang.id ? `bg-gradient-to-r ${lang.color} text-white shadow-md` : 'bg-surface-2/60 text-text-secondary hover:text-text-primary hover:bg-surface-3/50'}`}>
                    {lang.label}
                  </button>
                ))}
              </div>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-surface-2/50 border border-border/40 rounded-xl px-3 py-2 text-xs font-mono text-text-primary resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200" rows={5} placeholder="输入代码..." onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleRun() } }} />
              <button onClick={handleRun} disabled={isExecuting || !code.trim()} className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all duration-200">
                {isExecuting ? <><Square className="w-3 h-3" /> 执行中...</> : <><Play className="w-3.5 h-3.5" fill="currentColor" /> 运行</>}
              </button>
            </div>

            {lastResult && (
              <div className="px-3 py-2 animate-in">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {lastResult.timed_out ? <span className="text-xs text-warning font-medium">超时</span> : lastResult.success ? <span className="text-xs text-success font-medium">成功</span> : <span className="text-xs text-danger font-medium">失败</span>}
                    <span className="text-[10px] text-text-muted">{lastResult.duration_ms}ms</span>
                  </div>
                  <button onClick={handleCopyResult} className="text-text-muted hover:text-text-secondary p-1 rounded hover:bg-surface-2 transition-all">{copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}</button>
                </div>
                <pre className="bg-surface-2/50 rounded-xl p-2 text-xs font-mono text-text-secondary overflow-auto max-h-32 whitespace-pre-wrap border border-border/30 shadow-inner">{lastResult.stdout || lastResult.stderr || '(无输出)'}</pre>
              </div>
            )}
          </div>
        )}

        {/* Terminal tab */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 px-3 py-2 min-h-0 overflow-y-auto">
              {executions.filter(e => e.language === 'terminal').length === 0 && termHistory.length === 0 ? (
                <div className="text-xs text-text-muted py-6 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface-2/50 flex items-center justify-center animate-float"><Terminal className="w-5 h-5 text-text-muted/40" /></div>
                  <p>输入命令并按 Enter</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1">
                    {TERMINAL_HINTS.map(hint => (
                      <button key={hint} onClick={() => setTermInput(hint)} className="px-2 py-1 bg-surface-2/60 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-3/50 transition-all duration-200 text-[11px]">{hint}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {executions.filter(e => e.language === 'terminal').slice(0, 20).map((exec, idx) => (
                    <div key={exec.id || idx} className="text-xs p-2 rounded-lg hover:bg-surface-2/30 transition-colors">
                      <div className="font-mono text-primary font-medium">$ {exec.code.replace(/^\$ /, '')}</div>
                      {exec.stdout && <pre className="font-mono text-text-secondary whitespace-pre-wrap mt-0.5 max-h-24 overflow-auto pl-2 border-l-2 border-border/30">{exec.stdout}</pre>}
                      {exec.stderr && <pre className="font-mono text-danger/80 whitespace-pre-wrap mt-0.5 max-h-24 overflow-auto pl-2 border-l-2 border-danger/30">{exec.stderr}</pre>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-t border-border/40">
              <div className="flex items-center gap-2 bg-surface-2/50 rounded-xl px-3 py-2 border border-border/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200">
                <span className="text-xs text-primary font-mono font-bold">$</span>
                <input ref={termInputRef} value={termInput} onChange={(e) => setTermInput(e.target.value)} onKeyDown={handleTermKeyDown} placeholder={canUseTerminal ? '输入命令...' : '请切换权限'} disabled={!canUseTerminal || isExecuting} className="flex-1 bg-transparent text-xs font-mono text-text-primary outline-none disabled:opacity-50" autoFocus={activeTab === 'terminal'} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
