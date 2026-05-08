import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Terminal, Play, Plus, Trash2, FileText, FolderOpen, Folder,
  ChevronRight, ChevronDown, X, Copy, Check, RefreshCw,
  Code2, AlertTriangle, Shield,
} from 'lucide-react'
import { useSandboxStore } from '../../stores/sandboxStore'

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'javascript', label: 'JS', icon: '📜' },
]

// 常用终端命令提示
const TERMINAL_HINTS = ['dir', 'ls', 'echo "hello"', 'python --version', 'node --version', 'pip list', 'where node']

export default function SandboxPanel() {
  const {
    workspaces, activeWorkspaceId, executions, permissions,
    isExecuting, lastResult, panelOpen, activeTab,
    togglePanel, setActiveTab, setActiveWorkspace, createWorkspace, deleteWorkspace,
    refreshWorkspace, executeCode, executeTerminal, readFile, writeFile, deleteFile,
    fetchPermissions,
  } = useSandboxStore()

  const [code, setCode] = useState('# 在此输入 Python 代码\nprint("Hello from NexusFlow sandbox!")')
  const [language, setLanguage] = useState('python')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const [selectedPerm, setSelectedPerm] = useState('')
  const [copied, setCopied] = useState(false)
  const [permLoading, setPermLoading] = useState(true)
  const [error, setError] = useState('')

  // 终端状态
  const [termInput, setTermInput] = useState('')
  const [termHistory, setTermHistory] = useState<string[]>([])
  const [termHistoryIdx, setTermHistoryIdx] = useState(-1)
  const termInputRef = useRef<HTMLInputElement>(null)

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)

  // 加载权限模板
  useEffect(() => {
    setPermLoading(true)
    fetchPermissions()
      .catch(() => setError('无法连接后端服务'))
      .finally(() => setPermLoading(false))
  }, [])

  // 刷新当前工作空间
  useEffect(() => {
    if (activeWorkspaceId) {
      refreshWorkspace(activeWorkspaceId).catch(() => {})
    }
  }, [activeWorkspaceId])

  // 终端历史导航
  const handleTermKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIdx = termHistoryIdx < termHistory.length - 1 ? termHistoryIdx + 1 : termHistoryIdx
      setTermHistoryIdx(nextIdx)
      if (nextIdx >= 0) setTermInput(termHistory[termHistory.length - 1 - nextIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = termHistoryIdx > 0 ? termHistoryIdx - 1 : -1
      setTermHistoryIdx(nextIdx)
      if (nextIdx >= 0) setTermInput(termHistory[termHistory.length - 1 - nextIdx])
      else setTermInput('')
    } else if (e.key === 'Enter') {
      handleRunTerminal()
    }
  }, [termInput, termHistory, termHistoryIdx])

  const handleCreateWorkspace = async () => {
    setError('')
    try {
      await createWorkspace(selectedPerm || undefined)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleRun = async () => {
    setError('')
    if (!code.trim()) return
    try {
      if (!activeWorkspaceId) {
        await createWorkspace(selectedPerm || undefined)
      }
      await executeCode(code, language, { permissionId: selectedPerm || undefined })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleRunTerminal = async () => {
    const cmd = termInput.trim()
    if (!cmd) return
    setError('')
    setTermHistory(prev => [...prev, cmd])
    setTermHistoryIdx(-1)
    setTermInput('')
    try {
      if (!activeWorkspaceId) {
        await createWorkspace(selectedPerm || undefined)
      }
      await executeTerminal(cmd, { permissionId: selectedPerm || undefined })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleFileClick = async (filePath: string) => {
    if (!activeWorkspaceId || !activeWorkspace) return
    // 如果是目录则展开/折叠
    if (activeWorkspace.files.some(f => f.startsWith(filePath + '/') || f.startsWith(filePath + '\\'))) {
      setExpandedDirs(prev => {
        const next = new Set(prev)
        if (next.has(filePath)) next.delete(filePath)
        else next.add(filePath)
        return next
      })
      return
    }
    // 文件：预览
    setPreviewFile(filePath)
    try {
      const content = await readFile(activeWorkspaceId, filePath)
      setPreviewContent(content)
    } catch {
      setPreviewContent('(无法读取文件)')
    }
  }

  const handleNewFile = async () => {
    if (!newFileName.trim() || !activeWorkspaceId) return
    setError('')
    try {
      await writeFile(activeWorkspaceId, newFileName.trim(), '')
      setNewFileName('')
      setShowNewFile(false)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    if (!activeWorkspaceId) return
    setError('')
    try {
      await deleteFile(activeWorkspaceId, filePath)
      if (previewFile === filePath) {
        setPreviewFile(null)
        setPreviewContent('')
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleCopyResult = () => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult.stdout || lastResult.stderr || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentPerm = permissions.find(p => p.id === selectedPerm)
  const canUseTerminal = !currentPerm || currentPerm.allow_terminal

  // 构建文件树
  const buildFileTree = (files: string[]) => {
    const tree: Record<string, { name: string; children: Record<string, any>; isFile: boolean; fullPath: string }> = {}
    files.forEach(f => {
      const parts = f.split(/[/\\]/)
      let current = tree
      let accumulated = ''
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        accumulated = accumulated ? `${accumulated}/${part}` : part
        if (!current[part]) {
          current[part] = { name: part, children: {}, isFile: i === parts.length - 1, fullPath: accumulated }
        }
        if (i < parts.length - 1) {
          current = current[part].children
        }
      }
    })
    return tree
  }

  const renderTree = (tree: Record<string, any>, depth = 0) => {
    return Object.entries(tree)
      .sort(([a, av], [b, bv]) => {
        if (av.isFile !== bv.isFile) return av.isFile ? 1 : -1
        return a.localeCompare(b)
      })
      .map(([name, node]: [string, any]) => {
        const fullPath = node.fullPath || name
        const isExpanded = expandedDirs.has(fullPath)
        const isPreviewed = previewFile === fullPath

        if (node.isFile) {
          return (
            <div
              key={fullPath}
              onClick={() => handleFileClick(fullPath)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer hover:bg-surface-2 transition-colors group ${
                isPreviewed ? 'bg-primary/10 text-primary' : 'text-text-secondary'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFile(fullPath) }}
                className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        }

        return (
          <div key={fullPath}>
            <div
              onClick={() => handleFileClick(fullPath)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer hover:bg-surface-2 transition-colors text-text-secondary"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-warning" /> : <Folder className="w-3.5 h-3.5 text-warning/60" />}
              <span className="truncate">{name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        )
      })
  }

  if (!panelOpen) return null

  const fileTree = activeWorkspace ? buildFileTree(activeWorkspace.files) : {}

  return (
    <div className="w-96 h-full border-l border-border-secondary flex flex-col bg-surface-1 overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary">沙箱</span>
          {currentPerm && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
              {currentPerm.name}
            </span>
          )}
        </div>
        <button onClick={togglePanel} className="text-text-tertiary hover:text-text-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 工作空间 + 权限 工具栏 */}
      <div className="px-3 py-2 border-b border-border-tertiary space-y-1.5">
        <div className="flex items-center gap-2">
          <select
            value={activeWorkspaceId || ''}
            onChange={(e) => setActiveWorkspace(e.target.value || null)}
            className="flex-1 bg-surface-2 border border-border-tertiary rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">选择工作空间...</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.id.slice(0, 8)} ({ws.file_count} 文件)
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateWorkspace}
            disabled={isExecuting}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            title="新建工作空间"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {activeWorkspace && (
            <button
              onClick={() => { if (confirm('确定删除此工作空间？')) deleteWorkspace(activeWorkspace.id) }}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
              title="删除工作空间"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 权限选择 */}
        {permLoading ? (
          <div className="text-xs text-text-muted text-center py-1">加载权限中...</div>
        ) : permissions.length > 0 ? (
          <select
            value={selectedPerm}
            onChange={(e) => setSelectedPerm(e.target.value)}
            className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-primary"
          >
            <option value="">权限: 默认（无限制）</option>
            {permissions.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {p.description.slice(0, 20)}</option>
            ))}
          </select>
        ) : null}
      </div>

      {/* Tab 切换: 代码 / 终端 */}
      <div className="flex border-b border-border-tertiary">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'code' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          代码执行
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'terminal' ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          终端
          {!canUseTerminal && <Shield className="w-3 h-3 text-warning" />}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-2 bg-danger/10 border-b border-danger/20">
          <div className="flex items-start gap-1.5 text-xs text-danger">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-danger/60 hover:text-danger">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* ==================== 代码执行 Tab ==================== */}
        {activeTab === 'code' && (
          <>
            {/* 文件树 */}
            {activeWorkspace && (
              <div className="px-3 py-2 border-b border-border-tertiary">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-muted">文件</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowNewFile(!showNewFile)}
                      className="text-xs text-primary hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => refreshWorkspace(activeWorkspace.id)}
                      className="text-xs text-text-tertiary hover:text-text-secondary"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {showNewFile && (
                  <div className="flex gap-1 mb-1.5">
                    <input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNewFile()}
                      placeholder="filename.py"
                      className="flex-1 bg-surface-2 border border-border-tertiary rounded px-1.5 py-1 text-xs focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    <button onClick={handleNewFile} className="text-xs text-primary px-1.5">OK</button>
                  </div>
                )}
                {activeWorkspace.files.length === 0 ? (
                  <div className="text-xs text-text-muted py-2">空工作空间</div>
                ) : (
                  <div className="max-h-28 overflow-y-auto">{renderTree(fileTree)}</div>
                )}
              </div>
            )}

            {/* 文件预览 */}
            {previewFile && (
              <div className="px-3 py-2 border-b border-border-tertiary">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-muted font-mono">{previewFile}</span>
                  <button onClick={() => setPreviewFile(null)} className="text-text-tertiary hover:text-text-secondary">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <pre className="bg-background rounded-lg p-2 text-xs font-mono text-text-secondary overflow-auto max-h-24 whitespace-pre-wrap">
                  {previewContent}
                </pre>
              </div>
            )}

            {/* 代码执行区 */}
            <div className="px-3 py-2 border-b border-border-tertiary">
              <div className="flex gap-1 mb-1.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      language === lang.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {lang.icon} {lang.label}
                  </button>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary resize-none focus:outline-none focus:border-primary"
                rows={6}
                placeholder="输入代码..."
              />
              <button
                onClick={handleRun}
                disabled={isExecuting}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isExecuting ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    运行
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ==================== 终端 Tab ==================== */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full">
            {/* 终端权限提示 */}
            {!canUseTerminal && (
              <div className="mx-3 mt-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>当前权限模板不允许使用终端。请切换到「终端命令」或「开发工具箱」模板。</span>
                </div>
              </div>
            )}

            {/* 终端输出区 */}
            <div className="flex-1 px-3 py-2 min-h-0">
              {termHistory.length === 0 && !lastResult ? (
                <div className="text-xs text-text-muted py-4 text-center">
                  输入命令并按 Enter 执行
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {TERMINAL_HINTS.map(hint => (
                      <button
                        key={hint}
                        onClick={() => setTermInput(hint)}
                        className="px-1.5 py-0.5 bg-surface-2 rounded text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 max-h-full overflow-y-auto">
                  {/* 历史命令 */}
                  {executions
                    .filter(e => e.language === 'terminal')
                    .slice(0, 20)
                    .map((exec, idx) => (
                      <div key={exec.id || idx} className="text-xs">
                        <div className="font-mono text-text-muted">$ {exec.code.replace(/^\$ /, '')}</div>
                        {exec.stdout && (
                          <pre className="font-mono text-text-secondary whitespace-pre-wrap mt-0.5 max-h-32 overflow-auto">
                            {exec.stdout}
                          </pre>
                        )}
                        {exec.stderr && (
                          <pre className="font-mono text-danger/80 whitespace-pre-wrap mt-0.5 max-h-32 overflow-auto">
                            {exec.stderr}
                          </pre>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 终端输入 */}
            <div className="px-3 py-2 border-t border-border-tertiary">
              <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-2 py-1.5 border border-border-tertiary focus-within:border-primary">
                <span className="text-xs text-primary font-mono shrink-0">$</span>
                <input
                  ref={termInputRef}
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  onKeyDown={handleTermKeyDown}
                  placeholder={canUseTerminal ? '输入命令...' : '请切换权限模板'}
                  disabled={!canUseTerminal || isExecuting}
                  className="flex-1 bg-transparent text-xs font-mono text-text-primary outline-none disabled:opacity-50"
                  autoFocus={activeTab === 'terminal'}
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== 执行结果 ==================== */}
        {lastResult && (
          <div className="px-3 py-2 border-t border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {lastResult.timed_out ? (
                  <span className="text-xs text-warning">Timeout</span>
                ) : lastResult.success ? (
                  <span className="text-xs text-success">Success</span>
                ) : (
                  <span className="text-xs text-danger">Error</span>
                )}
                <span className="text-xs text-text-muted">{lastResult.duration_ms}ms</span>
                <span className="text-xs text-text-tertiary">{lastResult.language}</span>
              </div>
              {(lastResult.stdout || lastResult.stderr) && (
                <button onClick={handleCopyResult} className="text-text-tertiary hover:text-text-secondary">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            <pre className="bg-background rounded-lg p-2 text-xs font-mono text-text-secondary overflow-auto max-h-40 whitespace-pre-wrap">
              {lastResult.stdout || lastResult.stderr || '(无输出)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
