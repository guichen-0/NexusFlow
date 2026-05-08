import { useState, useEffect, useCallback } from 'react'
import {
  Terminal, Play, Plus, Trash2, FileText, FolderOpen, Folder,
  ChevronRight, ChevronDown, X, Copy, Check, RefreshCw,
} from 'lucide-react'
import { useSandboxStore } from '../../stores/sandboxStore'
import { apiWriteFile, apiReadFile } from '../../types/sandbox'

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'javascript', label: 'JavaScript', icon: '📜' },
]

export default function SandboxPanel() {
  const {
    workspaces, activeWorkspaceId, executions, permissions,
    isExecuting, lastResult, panelOpen,
    togglePanel, setActiveWorkspace, createWorkspace, deleteWorkspace,
    refreshWorkspace, executeCode, readFile, writeFile, deleteFile,
    fetchPermissions,
  } = useSandboxStore()

  const [code, setCode] = useState('print("Hello from sandbox!")')
  const [language, setLanguage] = useState('python')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [showNewFile, setShowNewFile] = useState(false)
  const [selectedPerm, setSelectedPerm] = useState('')
  const [copied, setCopied] = useState(false)

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const activeWs = activeWorkspace

  // 加载权限模板
  useEffect(() => {
    if (permissions.length === 0) fetchPermissions().catch(() => {})
  }, [])

  // 刷新当前工作空间
  useEffect(() => {
    if (activeWorkspaceId) {
      refreshWorkspace(activeWorkspaceId).catch(() => {})
    }
  }, [activeWorkspaceId, executions.length])

  const handleCreateWorkspace = async () => {
    try {
      await createWorkspace(selectedPerm || undefined)
      setShowNewFile(false)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleRun = async () => {
    if (!code.trim()) return
    try {
      if (!activeWorkspaceId) {
        await createWorkspace()
      }
      await executeCode(code, language, { permissionId: selectedPerm || undefined })
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleFileClick = async (filePath: string) => {
    if (!activeWorkspaceId || !activeWorkspace) return
    // 如果是目录则展开/折叠
    if (activeWorkspace.files.some(f => f.startsWith(filePath + '/'))) {
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
    try {
      await writeFile(activeWorkspaceId, newFileName.trim(), '')
      setNewFileName('')
      setShowNewFile(false)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    if (!activeWorkspaceId) return
    try {
      await deleteFile(activeWorkspaceId, filePath)
      if (previewFile === filePath) {
        setPreviewFile(null)
        setPreviewContent('')
      }
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCopyResult = () => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult.stdout || lastResult.stderr || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 构建文件树
  const buildFileTree = (files: string[]) => {
    const tree: Record<string, { name: string; children: Record<string, any>; isFile: boolean }> = {}
    files.forEach(f => {
      const parts = f.split(/[/\\]/)
      let current = tree
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (!current[part]) {
          current[part] = { name: part, children: {}, isFile: i === parts.length - 1 }
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
        const path = depth === 0 ? name : name // simplified for flat list
        const isExpanded = expandedDirs.has(name)
        const isPreviewed = previewFile === name

        if (node.isFile) {
          return (
            <div
              key={name}
              onClick={() => handleFileClick(name)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer hover:bg-surface-2 transition-colors group ${
                isPreviewed ? 'bg-primary/10 text-primary' : 'text-text-secondary'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFile(name) }}
                className="opacity-0 group-hover:opacity-100 text-danger/60 hover:text-danger transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        }

        return (
          <div key={name}>
            <div
              onClick={() => handleFileClick(name)}
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
    <div className="w-80 h-full border-l border-border-secondary flex flex-col bg-surface-1 overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-secondary">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary">沙箱</span>
        </div>
        <button onClick={togglePanel} className="text-text-tertiary hover:text-text-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 工作空间选择 */}
        <div className="px-3 py-2 border-b border-border-tertiary">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">工作空间</span>
            <div className="flex gap-1">
              <button
                onClick={handleCreateWorkspace}
                className="text-xs text-primary hover:underline"
                title="新建工作空间"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {activeWorkspace && (
                <button
                  onClick={() => { if (confirm('确定删除此工作空间？')) deleteWorkspace(activeWorkspace.id) }}
                  className="text-xs text-danger/60 hover:text-danger"
                  title="删除工作空间"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <select
            value={activeWorkspaceId || ''}
            onChange={(e) => setActiveWorkspace(e.target.value || null)}
            className="w-full bg-surface-2 border border-border-tertiary rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">选择工作空间...</option>
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.id} ({ws.file_count} 文件)
              </option>
            ))}
          </select>

          {/* 权限选择 */}
          {permissions.length > 0 && (
            <select
              value={selectedPerm}
              onChange={(e) => setSelectedPerm(e.target.value)}
              className="w-full mt-1.5 bg-surface-2 border border-border-tertiary rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-primary"
            >
              <option value="">权限: 默认</option>
              {permissions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

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
              <div className="max-h-32 overflow-y-auto">{renderTree(fileTree)}</div>
            )}
          </div>
        )}

        {/* 文件预览 */}
        {previewFile && (
          <div className="px-3 py-2 border-b border-border-tertiary">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">{previewFile}</span>
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
          <span className="text-xs text-text-muted mb-1.5 block">执行代码</span>
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
            rows={5}
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

        {/* 执行结果 */}
        {lastResult && (
          <div className="px-3 py-2">
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
              </div>
              {(lastResult.stdout || lastResult.stderr) && (
                <button onClick={handleCopyResult} className="text-text-tertiary hover:text-text-secondary">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            <pre className="bg-background rounded-lg p-2 text-xs font-mono text-text-secondary overflow-auto max-h-32 whitespace-pre-wrap">
              {lastResult.stdout || lastResult.stderr || '(无输出)'}
            </pre>
          </div>
        )}

        {/* 最近执行 */}
        {executions.length > 1 && (
          <div className="px-3 py-2">
            <span className="text-xs text-text-muted mb-1.5 block">最近执行</span>
            <div className="space-y-1">
              {executions.slice(1, 6).map((exec, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className={`w-1.5 h-1.5 rounded-full ${exec.success ? 'bg-success' : 'bg-danger'}`} />
                  <span className="truncate flex-1">{exec.language}</span>
                  <span>{exec.duration_ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
