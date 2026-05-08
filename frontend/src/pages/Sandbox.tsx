import { useState, useEffect } from 'react'
import {
  Terminal, Plus, Trash2, FolderOpen, Clock, Shield,
  CheckCircle, XCircle, AlertTriangle, Play, RefreshCw,
} from 'lucide-react'
import { useSandboxStore } from '../stores/sandboxStore'
import PermissionEditor from '../components/sandbox/PermissionEditor'
import type { Permission, ExecutionRecord } from '../types/sandbox'
import { apiCreatePermission, apiDeletePermission, apiCreateWorkspace, apiDeleteWorkspace } from '../types/sandbox'

type Tab = 'workspaces' | 'executions' | 'permissions'

export default function Sandbox() {
  const {
    workspaces, executions, permissions,
    createWorkspace, deleteWorkspace, fetchExecutions, fetchPermissions,
    refreshWorkspace, executeCode,
  } = useSandboxStore()

  const [activeTab, setActiveTab] = useState<Tab>('workspaces')
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null)
  const [showPermEditor, setShowPermEditor] = useState(false)
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null)
  const [quickCode, setQuickCode] = useState('print("Hello!")')
  const [quickLang, setQuickLang] = useState('python')
  const [quickResult, setQuickResult] = useState<ExecutionRecord | null>(null)
  const [isQuickRunning, setIsQuickRunning] = useState(false)
  const [newWsPerm, setNewWsPerm] = useState('')

  useEffect(() => {
    fetchExecutions().catch(() => {})
    fetchPermissions().catch(() => {})
  }, [])

  const handleCreateWorkspace = async () => {
    try {
      await createWorkspace(newWsPerm || undefined)
      setNewWsPerm('')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('确定删除此工作空间？所有文件将被清除。')) return
    try {
      await deleteWorkspace(id)
      if (expandedWorkspace === id) setExpandedWorkspace(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleQuickRun = async () => {
    setIsQuickRunning(true)
    setQuickResult(null)
    try {
      const record = await executeCode(quickCode, quickLang)
      setQuickResult(record)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsQuickRunning(false)
    }
  }

  const handleCreatePermission = async (data: Partial<Permission>) => {
    try {
      await apiCreatePermission(data)
      await fetchPermissions()
      setShowPermEditor(false)
      setEditingPerm(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDeletePermission = async (id: string) => {
    if (!confirm('确定删除此权限模板？')) return
    try {
      await apiDeletePermission(id)
      await fetchPermissions()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: 'workspaces', label: '工作空间', icon: FolderOpen, count: workspaces.length },
    { key: 'executions', label: '执行历史', icon: Clock, count: executions.length },
    { key: 'permissions', label: '权限管理', icon: Shield, count: permissions.length },
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
            <p className="text-sm text-text-secondary">代码执行环境、工作空间和权限管理</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-3 text-xs text-text-muted mr-4">
            <span>{workspaces.length} 个工作空间</span>
            <span>{executions.length} 次执行</span>
          </div>
          <button
            onClick={handleCreateWorkspace}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            新建工作空间
          </button>
        </div>
      </div>

      {/* 新建工作空间选项 */}
      <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-2.5">
        <span className="text-xs text-text-muted">创建时绑定权限：</span>
        <select
          value={newWsPerm}
          onChange={(e) => setNewWsPerm(e.target.value)}
          className="bg-surface-1 border border-border-tertiary rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-primary"
        >
          <option value="">不绑定（使用默认权限）</option>
          {permissions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

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
              暂无工作空间，点击"新建工作空间"创建
            </div>
          )}
          {workspaces.map(ws => {
            const isExpanded = expandedWorkspace === ws.id
            return (
              <div
                key={ws.id}
                className="border border-border-secondary rounded-xl overflow-hidden hover:border-border-tertiary transition-colors"
              >
                <div
                  className="px-4 py-3 cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setExpandedWorkspace(isExpanded ? null : ws.id)
                    if (!isExpanded) refreshWorkspace(ws.id).catch(() => {})
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-text-primary">{ws.id}</span>
                      {ws.permission_name && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                          {ws.permission_name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-text-muted">
                      <span>{ws.file_count} 文件</span>
                      <span>{formatBytes(ws.total_size)}</span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                      删除工作空间
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
                      <span className="text-sm font-medium text-text-primary">{exec.language}</span>
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
              onClick={() => { setEditingPerm(null); setShowPermEditor(true) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border-tertiary rounded-xl text-sm text-text-primary hover:bg-surface-3 transition-colors"
            >
              <Plus className="w-4 h-4" />
              自定义权限
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissions.map(perm => (
              <div
                key={perm.id}
                className={`border rounded-xl p-4 ${
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
                  {!perm.is_builtin && (
                    <button
                      onClick={() => handleDeletePermission(perm.id)}
                      className="text-text-tertiary hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-secondary mb-3">{perm.description}</p>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {[
                    { label: '联网', value: perm.allow_network },
                    { label: '文件读写', value: perm.allow_filesystem },
                    { label: '子进程', value: perm.allow_subprocess },
                    { label: '环境变量', value: perm.allow_env_vars },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      {item.value
                        ? <CheckCircle className="w-3 h-3 text-success" />
                        : <XCircle className="w-3 h-3 text-text-muted" />
                      }
                      <span className={item.value ? 'text-text-secondary' : 'text-text-muted'}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                  <span>超时 {perm.max_timeout}s</span>
                  <span>内存 {perm.max_memory_mb}MB</span>
                  <span>语言: {perm.allowed_languages.join(', ')}</span>
                </div>

                {!perm.is_builtin && (
                  <button
                    onClick={() => { setEditingPerm(perm); setShowPermEditor(true) }}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    编辑
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 权限编辑弹窗 */}
      {showPermEditor && (
        <PermissionEditor
          permission={editingPerm}
          onSave={handleCreatePermission}
          onCancel={() => { setShowPermEditor(false); setEditingPerm(null) }}
        />
      )}
    </div>
  )
}
