import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, ExecutionRecord, Permission } from '../types/sandbox'
import {
  apiCreateWorkspace, apiDeleteWorkspace, apiGetWorkspace,
  apiExecute, apiGetExecutions, apiGetPermissions,
  apiWriteFile, apiReadFile, apiDeleteFile,
} from '../types/sandbox'

interface SandboxState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  executions: ExecutionRecord[]
  permissions: Permission[]
  panelOpen: boolean
  isExecuting: boolean
  lastResult: ExecutionRecord | null

  // Actions
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
  setActiveWorkspace: (id: string | null) => void
  createWorkspace: (permissionId?: string) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
  refreshWorkspace: (id: string) => Promise<void>
  executeCode: (code: string, language: string, opts?: { workspaceId?: string; permissionId?: string; timeout?: number }) => Promise<ExecutionRecord>
  fetchExecutions: () => Promise<void>
  fetchPermissions: () => Promise<void>
  writeFile: (workspaceId: string, path: string, content: string) => Promise<void>
  readFile: (workspaceId: string, path: string) => Promise<string>
  deleteFile: (workspaceId: string, path: string) => Promise<void>
}

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      executions: [],
      permissions: [],
      panelOpen: false,
      isExecuting: false,
      lastResult: null,

      togglePanel: () => set(s => ({ panelOpen: !s.panelOpen })),
      setPanelOpen: (open) => set({ panelOpen: open }),

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      createWorkspace: async (permissionId) => {
        const data = await apiCreateWorkspace(permissionId)
        const ws: Workspace = {
          id: data.workspace_id,
          path: data.path,
          file_count: 0,
          files: [],
          total_size: 0,
          permission_id: data.permission_id || null,
          permission_name: null,
          created_at: data.created_at || new Date().toISOString(),
        }
        set(s => ({
          workspaces: [...s.workspaces, ws],
          activeWorkspaceId: ws.id,
        }))
        return ws
      },

      deleteWorkspace: async (id) => {
        await apiDeleteWorkspace(id)
        set(s => ({
          workspaces: s.workspaces.filter(w => w.id !== id),
          activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
        }))
      },

      refreshWorkspace: async (id) => {
        const info = await apiGetWorkspace(id)
        const ws: Workspace = {
          id,
          path: info.path,
          file_count: info.file_count,
          files: info.files || [],
          total_size: info.total_size || 0,
          permission_id: info.permission_id || null,
          permission_name: info.permission_name || null,
          created_at: '',
        }
        set(s => ({
          workspaces: s.workspaces.map(w => w.id === id ? { ...w, ...ws } : w),
        }))
      },

      executeCode: async (code, language, opts = {}) => {
        set({ isExecuting: true })
        try {
          const result = await apiExecute({
            code,
            language,
            workspace_id: opts.workspaceId || get().activeWorkspaceId || undefined,
            permission_id: opts.permissionId,
            timeout: opts.timeout,
          })
          const record: ExecutionRecord = {
            id: result.permission_id || String(Date.now()),
            code: code.slice(0, 500),
            language,
            permission_id: result.permission_id || null,
            permission_name: result.permission_name || null,
            workspace_id: opts.workspaceId || get().activeWorkspaceId || null,
            exit_code: result.exit_code,
            stdout: result.stdout,
            stderr: result.stderr,
            duration_ms: result.duration_ms,
            timed_out: result.timed_out,
            success: result.success,
            executed_at: new Date().toISOString(),
          }
          set(s => ({
            executions: [record, ...s.executions].slice(0, 100),
            lastResult: record,
            isExecuting: false,
          }))
          // 刷新工作空间文件列表
          const wsId = opts.workspaceId || get().activeWorkspaceId
          if (wsId) {
            get().refreshWorkspace(wsId).catch(() => {})
          }
          return record
        } catch (err: any) {
          set({ isExecuting: false })
          throw err
        }
      },

      fetchExecutions: async () => {
        const executions = await apiGetExecutions()
        set({ executions })
      },

      fetchPermissions: async () => {
        const permissions = await apiGetPermissions()
        set({ permissions })
      },

      writeFile: async (workspaceId, path, content) => {
        await apiWriteFile(workspaceId, path, content)
        get().refreshWorkspace(workspaceId).catch(() => {})
      },

      readFile: async (workspaceId, path) => {
        const result = await apiReadFile(workspaceId, path)
        return result.content
      },

      deleteFile: async (workspaceId, path) => {
        await apiDeleteFile(workspaceId, path)
        get().refreshWorkspace(workspaceId).catch(() => {})
      },
    }),
    {
      name: 'nexusflow-sandbox',
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        executions: state.executions,
      }),
    }
  )
)
