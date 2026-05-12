import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Terminal, Plus, Trash2, FolderOpen, Clock, Shield,
  CheckCircle, XCircle, AlertTriangle, Play, Square, RefreshCw,
  Code2, Globe, HardDrive, Cpu, FolderSync, Settings,
  ChevronDown, Edit3, FileCode, FolderUp, Upload, Download,
} from 'lucide-react'
import { useSandboxStore } from '../stores/sandboxStore'
import CodeEditor from '../components/sandbox/CodeEditor'
import FileTree from '../components/sandbox/FileTree'
import OutputPanel from '../components/sandbox/OutputPanel'
import SandboxLayout from '../components/sandbox/SandboxLayout'
import PermissionEditor from '../components/sandbox/PermissionEditor'
import type { Permission, ExecutionRecord } from '../types/sandbox'
import {
  apiCreatePermission, apiUpdatePermission, apiDeletePermission,
  apiWriteFile, apiReadFile, apiDeleteFile,
} from '../types/sandbox'

type Language = 'python' | 'javascript' | 'typescript' | 'bash'

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  bash: 'Bash',
}

const LANGUAGE_EXTENSIONS: Record<Language, string[]> = {
  python: ['.py'],
  javascript: ['.js', '.jsx'],
  typescript: ['.ts', '.tsx'],
  bash: ['.sh', '.bash'],
}

const DEFAULT_CODE: Record<Language, string> = {
  python: `# Python 示例
import sys

def main():
    name = "NexusFlow"
    print(f"Hello, {name}!")
    print(f"Python version: {sys.version}")

if __name__ == "__main__":
    main()
`,
  javascript: `// JavaScript 示例
function main() {
  const name = "NexusFlow";
  console.log(\`Hello, \${name}!\`);
  console.log(\`Node version: \${process.version}\`);
}

main();
`,
  typescript: `// TypeScript 示例
interface Greeting {
  name: string;
  message: string;
}

function createGreeting(name: string): Greeting {
  return {
    name,
    message: \`Hello, \${name}!\`,
  };
}

const greeting = createGreeting("NexusFlow");
console.log(greeting.message);
`,
  bash: `#!/bin/bash
# Bash 示例
echo "Hello, NexusFlow!"
echo "Current date: $(date)"
echo "Working directory: $(pwd)"
`,
}

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
    refreshWorkspace, executeCode, executeCodeStream,
    uploadFile, downloadFile,
    activeWorkspaceId, setActiveWorkspace,
    lastResult, isExecuting,
  } = useSandboxStore()

  const [code, setCode] = useState(DEFAULT_CODE.python)
  const [language, setLanguage] = useState<Language>('python')
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showCreateWs, setShowCreateWs] = useState(false)
  const [showPermEditor, setShowPermEditor] = useState(false)
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null)
  const [editingPermIsCopy, setEditingPermIsCopy] = useState(false)
  const [error, setError] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [isMounting, setIsMounting] = useState(false)
  const [newWsPerm, setNewWsPerm] = useState('')
  const [showWsDropdown, setShowWsDropdown] = useState(false)
  const dirInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeWorkspace = useMemo(
    () => workspaces.find(w => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  )

  const allPermCategories = useMemo(() => {
    const cats: Record<string, { label: string; icon: any; ids: string[] }> = { ...PERM_CATEGORIES }
    const customPerms = permissions.filter(p => !p.is_builtin)
    if (customPerms.length > 0) {
      cats['custom'] = { label: '自定义', icon: Edit3, ids: customPerms.map(p => p.id) }
    }
    return cats
  }, [permissions])

  useEffect(() => {
    Promise.all([fetchExecutions(), fetchPermissions()]).catch(() => {})
  }, [])

  const ensureWorkspace = useCallback(async () => {
    if (!activeWorkspaceId) {
      const ws = await createWorkspace()
      return ws.id
    }
    return activeWorkspaceId
  }, [activeWorkspaceId, createWorkspace])

  const handleRun = useCallback(async () => {
    setError('')
    try {
      const wsId = await ensureWorkspace()
      await executeCodeStream(code, language, {}, { workspaceId: wsId })
    } catch (e: any) {
      setError(e.message)
    }
  }, [code, language, ensureWorkspace, executeCodeStream])

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    if (!activeFile) setCode(DEFAULT_CODE[lang])
  }

  const handleCreateFile = async (name: string) => {
    try {
      const wsId = await ensureWorkspace()
      await apiWriteFile(wsId, name, '')
      await refreshWorkspace(wsId)
      setActiveFile(name)
      setCode('')
      const ext = '.' + name.split('.').pop()
      const lang = (Object.entries(LANGUAGE_EXTENSIONS).find(([, exts]) => exts.includes(ext))?.[0] as Language) || language
      setLanguage(lang)
    } catch (e: any) { setError(e.message) }
  }

  const handleDeleteFile = async (path: string) => {
    if (!activeWorkspaceId) return
    if (!confirm(`确定删除 ${path}？`)) return
    try {
      await apiDeleteFile(activeWorkspaceId, path)
      await refreshWorkspace(activeWorkspaceId)
      if (activeFile === path) { setActiveFile(null); setCode(DEFAULT_CODE[language]) }
    } catch (e: any) { setError(e.message) }
  }

  const handleSelectFile = async (path: string) => {
    if (!activeWorkspaceId) return
    try {
      const result = await apiReadFile(activeWorkspaceId, path)
      setCode(result.content)
      setActiveFile(path)
      const ext = '.' + path.split('.').pop()
      const lang = (Object.entries(LANGUAGE_EXTENSIONS).find(([, exts]) => exts.includes(ext))?.[0] as Language)
      if (lang) setLanguage(lang)
    } catch (e: any) { setError(e.message) }
  }

  const handleSaveFile = async () => {
    if (!activeWorkspaceId || !activeFile) return
    try { await apiWriteFile(activeWorkspaceId, activeFile, code) } catch (e: any) { setError(e.message) }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !activeWorkspaceId) return
    for (const file of Array.from(files)) {
      try {
        await uploadFile(activeWorkspaceId, file)
      } catch (err: any) { setError(err.message) }
    }
    e.target.value = ''
  }

  const handleDownloadFile = async () => {
    if (!activeWorkspaceId || !activeFile) return
    try {
      const blob = await downloadFile(activeWorkspaceId, activeFile)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeFile.split(/[/\\]/).pop() || activeFile
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { setError(e.message) }
  }

  const handleCreateWorkspace = async () => {
    setError('')
    try {
      await createWorkspace({ permissionId: newWsPerm || undefined, type: 'virtual' })
      setNewWsPerm(''); setShowCreateWs(false)
    } catch (e: any) { setError(e.message) }
  }

  const handleDirSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Extract directory path from webkitRelativePath
    const relPath = (file as any).webkitRelativePath || file.name
    const dirName = relPath.split('/')[0]
    // We need the absolute path — use the directory input's webkitdirectory trick
    // The browser gives us relative paths, so we use the path input as fallback
    // For native directory pick, we send the directory name and let the backend resolve
    setLocalPath(dirName)
    e.target.value = ''
  }

  const handleMountLocal = async () => {
    const path = localPath.trim()
    if (!path) return
    setError(''); setIsMounting(true)
    try {
      await createWorkspace({ permissionId: newWsPerm || undefined, type: 'local', path })
      setLocalPath(''); setShowCreateWs(false)
    } catch (e: any) { setError(e.message) } finally { setIsMounting(false) }
  }

  const handleDeleteWorkspace = async (id: string) => {
    const ws = workspaces.find(w => w.id === id)
    const msg = ws?.type === 'local' ? '确定解除此本地目录的绑定？' : '确定删除此虚拟工作空间？'
    if (!confirm(msg)) return
    try { await deleteWorkspace(id); setShowWsDropdown(false) } catch (e: any) { setError(e.message) }
  }

  const handleCreatePermission = async (data: Partial<Permission>) => {
    try { await apiCreatePermission(data); await fetchPermissions(); setShowPermEditor(false); setEditingPerm(null) } catch (e: any) { setError(e.message) }
  }
  const handleEditPermission = async (data: Partial<Permission>) => {
    if (!editingPerm) return
    try { await apiUpdatePermission(editingPerm.id, data); await fetchPermissions(); setShowPermEditor(false); setEditingPerm(null) } catch (e: any) { setError(e.message) }
  }
  const handleDeletePermission = async (id: string) => {
    if (!confirm('确定删除此权限模板？')) return
    try { await apiDeletePermission(id); await fetchPermissions() } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background relative">
      {/* Top bar — glass effect, z-20 so dropdowns render above CodeMirror */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border/50 glass relative z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold gradient-text hidden sm:block">Sandbox</span>
        </div>

        <div className="w-px h-6 bg-border/50" />

        {/* Workspace selector */}
        <div className="relative">
          <button
            onClick={() => setShowWsDropdown(!showWsDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-surface-2/80 border border-border/60 hover:border-primary/40 hover:bg-surface-3/50 transition-all duration-200 hover:shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-text-secondary max-w-[120px] truncate">
              {activeWorkspace
                ? (activeWorkspace.type === 'local' ? activeWorkspace.path.split(/[/\\]/).filter(Boolean).pop() : activeWorkspace.id.slice(0, 8))
                : '选择空间'}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${showWsDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showWsDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl shadow-black/30 z-50 py-1 animate-in">
              {workspaces.length === 0 ? (
                <div className="px-3 py-5 text-center text-text-muted text-xs">暂无工作空间</div>
              ) : (
                workspaces.map(ws => (
                  <div key={ws.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 ${ws.id === activeWorkspaceId ? 'bg-primary/10 text-primary' : 'hover:bg-surface-2 text-text-secondary'}`}>
                    <button onClick={() => { setActiveWorkspace(ws.id); setShowWsDropdown(false) }} className="flex-1 flex items-center gap-2 text-left">
                      <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${ws.type === 'local' ? 'text-primary' : 'text-warning'}`} />
                      <span className="text-sm truncate">{ws.type === 'local' ? ws.path.split(/[/\\]/).filter(Boolean).pop() : ws.id.slice(0, 8)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ws.type === 'local' ? 'bg-primary/15 text-primary' : 'bg-warning/10 text-warning'}`}>{ws.type === 'local' ? '本地' : '虚拟'}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id) }} className="p-1 text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
              <div className="border-t border-border/50 mt-1 pt-1">
                <button onClick={() => { setShowCreateWs(true); setShowWsDropdown(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> 新建工作空间
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language selector */}
        <div className="flex items-center bg-surface-2/60 rounded-xl border border-border/40 p-0.5">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                language === lang
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-3/50'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border/50" />

        {/* Run button — glow effect */}
        <button
          onClick={handleRun}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
        >
          {isExecuting ? (
            <><Square className="w-3.5 h-3.5" /> 执行中</>
          ) : (
            <><Play className="w-3.5 h-3.5" fill="currentColor" /> 运行</>
          )}
        </button>

        {activeFile && (
          <button onClick={handleSaveFile} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-2 hover:text-primary border border-border/50 transition-all duration-200">
            保存
          </button>
        )}

        {activeFile && (
          <button onClick={handleDownloadFile} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface-2 hover:text-primary transition-all duration-200" title="下载文件">
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface-2 hover:text-primary transition-all duration-200" title="上传文件">
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" multiple onChange={handleUploadFile} className="hidden" />

        <div className="flex-1" />

        {/* Permissions toggle */}
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all duration-200 ${
            showPermissions ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-surface-2 hover:text-text-secondary border border-transparent'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden md:block">权限</span>
        </button>
      </div>

      {/* Error bar — slide animation */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-danger/10 border-b border-danger/20 text-xs text-danger animate-in">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-danger/60 hover:text-danger transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0">
          <SandboxLayout
            sidebar={<FileTree files={activeWorkspace?.files || []} activeFile={activeFile} onSelectFile={handleSelectFile} onCreateFile={handleCreateFile} onDeleteFile={handleDeleteFile} onRefresh={activeWorkspaceId ? () => refreshWorkspace(activeWorkspaceId) : undefined} loading={isExecuting} />}
            editor={
              <div className="h-full flex flex-col relative isolate">
                {activeFile && (
                  <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-surface/80">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/10">
                      <FileCode className="w-3 h-3" /> {activeFile}
                    </div>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <CodeEditor value={code} onChange={setCode} language={language} onSubmit={handleRun} placeholder="在此编写代码..." />
                </div>
              </div>
            }
            output={<OutputPanel result={lastResult} history={executions} isRunning={isExecuting} onSelectHistory={(record) => { setCode(record.code) }} />}
          />
        </div>

        {/* Permissions panel — slide-in with glass */}
        {showPermissions && (
          <div className="w-80 shrink-0 border-l border-border/40 glass overflow-y-auto animate-in">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-surface/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-text-primary">权限模板</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditingPerm(null); setEditingPermIsCopy(false); setShowPermEditor(true) }} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-all duration-200" title="新建权限">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setShowPermissions(false)} className="p-1.5 text-text-muted hover:text-text-secondary rounded-lg hover:bg-surface-2 transition-all duration-200">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-4">
              {Object.entries(allPermCategories).map(([catKey, cat]) => {
                const catPerms = permissions.filter(p => cat.ids.includes(p.id))
                if (catPerms.length === 0) return null
                return (
                  <div key={catKey}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <cat.icon className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{cat.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      {catPerms.map(perm => (
                        <div key={perm.id} className={`group p-2.5 rounded-xl border transition-all duration-200 ${perm.is_builtin ? 'border-border/60 hover:border-border-2 bg-surface-2/50 hover:shadow-sm' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-text-primary">{perm.name}</span>
                              {perm.is_builtin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-3 text-text-muted font-medium">内置</span>}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingPerm(perm); setEditingPermIsCopy(perm.is_builtin); setShowPermEditor(true) }} className="p-1 text-text-muted hover:text-primary rounded transition-colors" title={perm.is_builtin ? '基于此创建副本' : '编辑'}>
                                <Edit3 className="w-3 h-3" />
                              </button>
                              {!perm.is_builtin && (
                                <button onClick={() => handleDeletePermission(perm.id)} className="p-1 text-text-muted hover:text-danger rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-text-muted mb-1.5 line-clamp-2">{perm.description}</p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                            {[
                              { label: '联网', value: perm.allow_network, icon: Globe },
                              { label: '文件', value: perm.allow_filesystem, icon: FolderOpen },
                              { label: '子进程', value: perm.allow_subprocess, icon: Cpu },
                              { label: '终端', value: perm.allow_terminal, icon: Terminal },
                            ].map(item => (
                              <span key={item.label} className={`flex items-center gap-0.5 ${item.value ? 'text-success' : 'text-text-muted/40'}`}>
                                <item.icon className="w-3 h-3" /> {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create workspace modal — glass + animation */}
      {showCreateWs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in">
          <div className="bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl shadow-black/30 animate-in">
            <h3 className="text-base font-bold gradient-text">新建工作空间</h3>

            <div className="space-y-3">
              {/* Virtual workspace */}
              <button onClick={handleCreateWorkspace} className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:border-warning/40 hover:bg-warning/5 transition-all duration-200 hover:shadow-md hover:shadow-warning/5 text-left group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <FolderOpen className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">虚拟空间</div>
                  <div className="text-xs text-text-muted">临时目录，关闭后清除</div>
                </div>
              </button>

              {/* Local mount — native directory picker */}
              <div className="border border-border/60 rounded-xl p-3.5 space-y-2.5 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FolderUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">挂载本地目录</div>
                    <div className="text-xs text-text-muted">选择本地文件夹作为工作空间</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMountLocal()}
                    placeholder="输入绝对路径或点击浏览"
                    className="flex-1 bg-surface-2/80 border border-border/50 rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  />
                  <input
                    ref={dirInputRef}
                    type="file"
                    // @ts-ignore — webkitdirectory is non-standard
                    webkitdirectory=""
                    onChange={handleDirSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => dirInputRef.current?.click()}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-surface-2/80 border border-border/50 rounded-lg text-sm text-text-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
                  >
                    <FolderUp className="w-4 h-4" />
                    浏览
                  </button>
                </div>
              </div>
            </div>

            {/* Permission selector */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block font-medium">权限模板</label>
              <select value={newWsPerm} onChange={(e) => setNewWsPerm(e.target.value)} className="w-full bg-surface-2/80 border border-border/50 rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200">
                <option value="">默认权限</option>
                {permissions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCreateWs(false); setLocalPath('') }} className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all duration-200">
                取消
              </button>
              {localPath.trim() && (
                <button onClick={handleMountLocal} disabled={isMounting} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 transition-all duration-200">
                  {isMounting ? '挂载中...' : '挂载'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPermEditor && (
        <PermissionEditor permission={editingPerm} isCopyFromBuiltin={editingPermIsCopy} onSave={editingPerm ? handleEditPermission : handleCreatePermission} onCancel={() => { setShowPermEditor(false); setEditingPerm(null) }} />
      )}
    </div>
  )
}
