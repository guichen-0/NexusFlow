import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Terminal, Plus, Trash2, FolderOpen, Clock, Shield,
  CheckCircle, XCircle, AlertTriangle, Play, RefreshCw,
  Code2, Globe, HardDrive, Cpu, Monitor, FolderSync,
  Edit3, Search,
} from 'lucide-react'
import { useSandboxStore } from '../stores/sandboxStore'
import PermissionEditor from '../components/sandbox/PermissionEditor'
import FolderPicker from '../components/sandbox/FolderPicker'
import type { Permission, ExecutionRecord } from '../types/sandbox'
import { apiCreatePermission, apiUpdatePermission, apiDeletePermission } from '../types/sandbox'

type Tab = 'workspaces' | 'executions' | 'permissions' | 'terminal'

// 权限分类
  // 权限分类（内置模板）
  const PERM_CATEGORIES: Record<string, { label: string; icon: any; ids: string[] }> = {
    basic: { label: '基础', icon: Shield, ids: ['isolated'] },
    data: { label: '数据', icon: HardDrive, ids: ['data-analysis', 'machine-learning'] },
    network: { label: '网络', icon: Globe, ids: ['web-request', 'web-scraping'] },
    dev: { label: '开发', icon: Code2, ids: ['frontend-dev', 'terminal', 'dev-tools'] },
    full: { label: '全能', icon: Cpu, ids: ['full-access'] },
  }

export default function Sandbox() {
  const {
    workspaces, executions, permissions,
    createWorkspace, deleteWorkspace, fetchExecutions, fetchPermissions,
    refreshWorkspace, executeCode, executeTerminal, activeWorkspaceId,
    setActiveWorkspace,
  } = useSandboxStore()

  const [activeTab, setActiveTab] = useState<Tab>('workspaces')
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null)
  const [showPermEditor, setShowPermEditor] = useState(false)
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null)
  const [editingPermIsCopy, setEditingPermIsCopy] = useState(false)
  const [newWsPerm, setNewWsPerm] = useState('')
  const [error, setError] = useState('')
  const [permLoading, setPermLoading] = useState(true)

  // 挂载本地目录状态
  const [showMountInput, setShowMountInput] = useState(false)
  const [localPath, setLocalPath] = useState('')
  const [isMounting, setIsMounting] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  // 终端状态
  const [termInput, setTermInput] = useState('')
  const [termHistory, setTermHistory] = useState<string[]>([])
  const [termHistoryIdx, setTermHistoryIdx] = useState(-1)
  const [isTermRunning, setIsTermRunning] = useState(false)

  // 动态权限分类：内置 + 自定义
  const allPermCategories = useMemo(() => {
    const cats: Record<string, { label: string; icon: any; ids: string[] }> = { ...PERM_CATEGORIES }
    const customPerms = permissions.filter(p => !p.is_builtin)
    if (customPerms.length > 0) {
      cats['custom'] = { label: '自定义', icon: Edit3, ids: customPerms.map(p => p.id) }
    }
    return cats
  }, [permissions])

  useEffect(() => {
    setPermLoading(true)
    Promise.all([
      fetchExecutions(),
      fetchPermissions(),
    ])
      .catch(() => setError('无法连接后端服务'))
      .finally(() => setPermLoading(false))
  }, [])

  const handleCreateWorkspace = async () => {
    setError('')
    try {
      await createWorkspace({ permissionId: newWsPerm || undefined, type: 'virtual' })
      setNewWsPerm('')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleMountLocal = async () => {
    const path = localPath.trim()
    if (!path) return
    setError('')
    setIsMounting(true)
    try {
      await createWorkspace({ permissionId: newWsPerm || undefined, type: 'local', path })
      setLocalPath('')
      setShowMountInput(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsMounting(false)
    }
  }

  const handleFolderSelect = () => {
    setShowFolderPicker(true)
  }

  const handleFolderPick = async (path: string) => {
    setShowFolderPicker(false)
    setLocalPath(path)
    setError('')
    setIsMounting(true)
    try {
      await createWorkspace({ permissionId: newWsPerm || undefined, type: 'local', path })
      setLocalPath('')
      setShowMountInput(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsMounting(false)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    const ws = workspaces.find(w => w.id === id)
    const msg = ws?.type === 'local'
      ? '确定解除此本地目录的绑定？（物理目录不会被删除）'
      : '确定删除此虚拟工作空间？所有文件将被清除。'
    if (!confirm(msg)) return
    setError('')
    try {
      await deleteWorkspace(id)
      if (expandedWorkspace === id) setExpandedWorkspace(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

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

  const handleRunTerminal = async () => {
    const cmd = termInput.trim()
    if (!cmd) return
    setError('')
    setIsTermRunning(true)
    setTermHistory(prev => [...prev, cmd])
    setTermHistoryIdx(-1)
    setTermInput('')
    try {
      if (!activeWorkspaceId) {
        await createWorkspace()
      }
      await executeTerminal(cmd)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsTermRunning(false)
    }
  }

  const handleCreatePermission = async (data: Partial<Permission>) => {
    try {
      await apiCreatePermission(data)
      await fetchPermissions()
      setShowPermEditor(false)
      setEditingPerm(null)
      setEditingPermIsCopy(false)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleEditPermission = async (data: Partial<Permission>) => {
    if (!editingPerm) return
    try {
      await apiUpdatePermission(editingPerm.id, data)
      await fetchPermissions()
      setShowPermEditor(false)
      setEditingPerm(null)
      setEditingPermIsCopy(false)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDeletePermission = async (id: string) => {
    if (!confirm('确定删除此权限模板？')) return
    try {
      await apiDeletePermission(id)
      await fetchPermissions()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const openPermEditor = (perm: Permission) => {
    setEditingPerm(perm)
    setEditingPermIsCopy(perm.is_builtin)
    setShowPermEditor(true)
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 工作空间显示名称
  const getWsDisplayName = (ws: { id: string; path: string; type: string }) => {
    if (ws.type === 'local') {
      return ws.path.split(/[/\\]/).filter(Boolean).pop() || ws.path
    }
    return ws.id.slice(0, 12)
  }

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: 'workspaces', label: '工作空间', icon: FolderOpen, count: workspaces.length },
    { key: 'executions', label: '执行历史', icon: Clock, count: executions.length },
    { key: 'permissions', label: '权限模板', icon: Shield, count: permissions.length },
    { key: 'terminal', label: '终端', icon: Terminal, count: executions.filter(e => e.language === 'terminal').length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">沙箱管理</h1>
            <p className="text-sm text-text-secondary">代码执行环境、工作空间、权限和终端</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-3 text-xs text-text-muted mr-4">
            <span>{workspaces.length} 工作空间</span>
            <span>{executions.length} 执行</span>
          </div>
          <button
            onClick={() => setShowMountInput(!showMountInput)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-tertiary rounded-xl text-sm text-text-primary hover:bg-surface-3 transition-colors"
          >
            <FolderSync className="w-4 h-4" />
            挂载本地目录
          </button>
          <button
            onClick={handleCreateWorkspace}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建虚拟空间
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-danger/60 hover:text-danger">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 挂载本地目录输入框 */}
      {showMountInput && (
        <div className="bg-surface-2 rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <FolderSync className="w-4 h-4 text-primary shrink-0" />
            <input
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMountLocal()}
              placeholder="输入本地目录绝对路径，如 F:\MyProject"
              className="flex-1 bg-surface-1 border border-border-tertiary rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleFolderSelect}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-surface-1 border border-border-tertiary rounded-lg text-sm text-text-secondary hover:bg-surface-3 hover:border-primary/50 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              浏览
            </button>
            {permLoading ? (
              <span className="text-xs text-text-muted">加载中...</span>
            ) : (
              <select
                value={newWsPerm}
                onChange={(e) => setNewWsPerm(e.target.value)}
                className="bg-surface-1 border border-border-tertiary rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-primary"
              >
                <option value="">默认权限</option>
                {permissions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleMountLocal}
              disabled={isMounting || !localPath.trim()}
              className="shrink-0 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isMounting ? '挂载中...' : '挂载'}
            </button>
            <button
              onClick={() => { setShowMountInput(false); setLocalPath('') }}
              className="text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-surface-1 text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-surface-tertiary text-text-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ==================== 工作空间 Tab ==================== */}
      {activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-muted text-sm">
              暂无工作空间，点击上方按钮新建虚拟空间或挂载本地目录
            </div>
          )}
          {workspaces.map(ws => {
            const isExpanded = expandedWorkspace === ws.id
            const isLocal = ws.type === 'local'
            return (
              <div
                key={ws.id}
                className={`border rounded-xl overflow-hidden hover:border-border-tertiary transition-colors ${
                  isLocal ? 'border-primary/20 bg-primary/[0.02]' : 'border-border-secondary'
                }`}
              >
                <div
                  className="px-4 py-3 cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setExpandedWorkspace(isExpanded ? null : ws.id)
                    if (!isExpanded) refreshWorkspace(ws.id).catch(() => {})
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderOpen className={`w-4 h-4 shrink-0 ${isLocal ? 'text-primary' : 'text-warning'}`} />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {getWsDisplayName(ws)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${
                        isLocal ? 'bg-primary/10 text-primary' : 'bg-surface-tertiary text-text-muted'
                      }`}>
                        {isLocal ? '本地' : '虚拟'}
                      </span>
                      {ws.permission_name && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary shrink-0">
                          {ws.permission_name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-text-muted">
                      <span>{ws.file_count} 文件</span>
                      <span>{formatBytes(ws.total_size)}</span>
                      {isLocal && (
                        <span className="truncate font-mono" title={ws.path}>{ws.path}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-tertiary transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-border-tertiary bg-surface-2">
                    {ws.files.length === 0 ? (
                      <p className="text-xs text-text-muted">空工作空间</p>
                    ) : (
                      <div className="space-y-0.5 max-h-32 overflow-y-auto">
                        {ws.files.map(f => (
                          <div key={f} className="text-xs text-text-secondary font-mono">{f}</div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id) }}
                      className="mt-2 flex items-center gap-1 text-xs text-danger/70 hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {isLocal ? '解除绑定' : '删除工作空间'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ==================== 执行历史 Tab ==================== */}
      {activeTab === 'executions' && (
        <div>
          {executions.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm">
              暂无执行记录
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((exec, idx) => (
                <div
                  key={exec.id || idx}
                  className="flex items-center gap-4 px-4 py-3 border border-border-secondary rounded-xl hover:border-border-tertiary transition-colors"
                >
                  <div className="shrink-0">
                    {exec.timed_out ? (
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    ) : exec.success ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium text-text-primary ${
                        exec.language === 'terminal' ? 'font-mono' : ''
                      }`}>
                        {exec.language === 'terminal' ? '$' : ''} {exec.language}
                      </span>
                      {exec.permission_name && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                          {exec.permission_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted font-mono truncate mt-0.5">
                      {exec.code.slice(0, 100)}{exec.code.length > 100 ? '...' : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-text-secondary">{exec.duration_ms}ms</div>
                    <div className="text-xs text-text-muted">{new Date(exec.executed_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== 权限管理 Tab ==================== */}
      {activeTab === 'permissions' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setEditingPerm(null); setEditingPermIsCopy(false); setShowPermEditor(true) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-tertiary rounded-xl text-sm text-text-primary hover:bg-surface-3 transition-colors"
            >
              <Plus className="w-4 h-4" />
              自定义权限
            </button>
          </div>

          {permLoading ? (
            <div className="text-center py-12 text-text-muted text-sm">加载权限模板中...</div>
          ) : (
            Object.entries(allPermCategories).map(([catKey, cat]) => {
              const catPerms = permissions.filter(p => cat.ids.includes(p.id))
              if (catPerms.length === 0) return null
              return (
                <div key={catKey} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <cat.icon className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-secondary">{cat.label}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catPerms.map(perm => (
                      <div
                        key={perm.id}
                        className={`border rounded-xl p-4 transition-all hover:shadow-sm ${
                          perm.is_builtin
                            ? 'border-border-secondary bg-surface-2'
                            : 'border-primary/20 bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className={`w-4 h-4 ${perm.is_builtin ? 'text-text-muted' : 'text-primary'}`} />
                            <span className="text-sm font-semibold text-text-primary">{perm.name}</span>
                            {perm.is_builtin && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-surface-tertiary text-text-muted">内置</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openPermEditor(perm)}
                              className="text-text-tertiary hover:text-primary transition-colors"
                              title={perm.is_builtin ? '基于此模板创建可编辑副本' : '编辑'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {!perm.is_builtin && (
                              <button
                                onClick={() => handleDeletePermission(perm.id)}
                                className="text-text-tertiary hover:text-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary mb-3">{perm.description}</p>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {[
                            { label: '联网', value: perm.allow_network },
                            { label: '文件读写', value: perm.allow_filesystem },
                            { label: '子进程', value: perm.allow_subprocess },
                            { label: '环境变量', value: perm.allow_env_vars },
                            { label: '终端', value: perm.allow_terminal },
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-1">
                              {item.value
                                ? <CheckCircle className="w-3 h-3 text-success" />
                                : <XCircle className="w-3 h-3 text-text-muted/50" />
                              }
                              <span className={item.value ? 'text-text-secondary' : 'text-text-muted/50'}>{item.label}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                          <span>超时 {perm.max_timeout}s</span>
                          <span>内存 {perm.max_memory_mb}MB</span>
                          <span>{perm.allowed_languages.join(', ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ==================== 终端 Tab ==================== */}
      {activeTab === 'terminal' && (
        <div className="border border-border-secondary rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border-tertiary">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">终端</span>
              {activeWorkspaceId && (
                <span className="text-xs text-text-muted">
                  工作空间: {workspaces.find(w => w.id === activeWorkspaceId)?.path?.split(/[/\\]/).pop() || activeWorkspaceId.slice(0, 8)}
                </span>
              )}
            </div>
            <button
              onClick={() => setTermInput('')}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              清空
            </button>
          </div>

          <div className="bg-background p-4 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-xs">
            {executions.filter(e => e.language === 'terminal').length === 0 && termHistory.length === 0 ? (
              <div className="text-text-muted py-8 text-center font-sans">
                在下方输入命令并按 Enter 执行
              </div>
            ) : (
              <div className="space-y-2">
                {executions
                  .filter(e => e.language === 'terminal')
                  .map((exec, idx) => (
                    <div key={exec.id || idx}>
                      <div className="text-primary">
                        <span className="text-text-muted">$ </span>
                        <span>{exec.code.replace(/^\$ /, '')}</span>
                      </div>
                      {exec.stdout && (
                        <pre className="text-text-secondary whitespace-pre-wrap mt-1 pl-4 border-l-2 border-border-tertiary">
                          {exec.stdout}
                        </pre>
                      )}
                      {exec.stderr && (
                        <pre className="text-danger/80 whitespace-pre-wrap mt-1 pl-4 border-l-2 border-danger/30">
                          {exec.stderr}
                        </pre>
                      )}
                      <div className="text-text-muted text-xs mt-1">
                        {exec.duration_ms}ms
                        {!exec.success && <span className="text-danger ml-2">exit {exec.exit_code}</span>}
                      </div>
                    </div>
                  ))}
                {isTermRunning && (
                  <div className="text-primary animate-pulse">
                    <span className="text-text-muted">$ </span>
                    {termInput} (执行中...)
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-surface-2 border-t border-border-tertiary">
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border-tertiary focus-within:border-primary">
              <span className="text-primary font-mono text-sm">$</span>
              <input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={handleTermKeyDown}
                placeholder="输入命令..."
                disabled={isTermRunning}
                className="flex-1 bg-transparent font-mono text-sm text-text-primary outline-none disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* 权限编辑弹窗 */}
      {showPermEditor && (
        <PermissionEditor
          permission={editingPerm}
          isCopyFromBuiltin={editingPermIsCopy}
          onSave={editingPerm ? handleEditPermission : handleCreatePermission}
          onCancel={() => { setShowPermEditor(false); setEditingPerm(null); setEditingPermIsCopy(false) }}
        />
      )}

      {/* 文件夹选择器 */}
      {showFolderPicker && (
        <FolderPicker
          onSelect={handleFolderPick}
          onCancel={() => setShowFolderPicker(false)}
        />
      )}
    </div>
  )
}
