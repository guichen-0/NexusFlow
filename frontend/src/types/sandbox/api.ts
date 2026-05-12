import type { Permission, Workspace, ExecutionRecord, ExecuteResult, BrowseResult } from './types'

export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1/sandbox'

export async function apiExecute(params: {
  code: string
  language: string
  timeout?: number
  workspace_id?: string
  permission_id?: string
}): Promise<ExecuteResult> {
  const res = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '执行失败')
  }
  return res.json()
}

export async function apiExecuteTerminal(params: {
  command: string
  workspace_id?: string
  permission_id?: string
  timeout?: number
}): Promise<ExecuteResult> {
  const res = await fetch(`${API_BASE}/terminal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '终端执行失败')
  }
  return res.json()
}

export async function apiCreateWorkspace(opts?: { permissionId?: string; type?: 'virtual' | 'local'; path?: string }): Promise<{ workspace_id: string; path: string; type: string; permission_id?: string; created_at?: string }> {
  const body = opts ? {
    type: opts.type || 'virtual',
    path: opts.path,
    permission_id: opts.permissionId,
  } : undefined
  const res = await fetch(`${API_BASE}/workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '创建工作空间失败')
  }
  return res.json()
}

export async function apiGetWorkspace(id: string): Promise<Workspace> {
  const res = await fetch(`${API_BASE}/workspace/${id}`)
  if (!res.ok) throw new Error('获取工作空间失败')
  return res.json()
}

export async function apiDeleteWorkspace(id: string, path?: string): Promise<void> {
  let url = `${API_BASE}/workspace/${id}`
  if (path) {
    url += `?path=${encodeURIComponent(path)}`
  }
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `删除失败 (${res.status})` }))
    throw new Error(err.detail || `删除失败 (${res.status})`)
  }
}

export async function apiWriteFile(workspaceId: string, path: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspace/file/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, path, content }),
  })
  if (!res.ok) throw new Error('写入文件失败')
}

export async function apiReadFile(workspaceId: string, path: string): Promise<{ path: string; content: string }> {
  const res = await fetch(`${API_BASE}/workspace/file/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, path }),
  })
  if (!res.ok) throw new Error('读取文件失败')
  return res.json()
}

export async function apiDeleteFile(workspaceId: string, path: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/workspace/file/delete?workspace_id=${workspaceId}&path=${encodeURIComponent(path)}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error('删除文件失败')
}

export async function apiGetExecutions(limit = 50): Promise<ExecutionRecord[]> {
  const res = await fetch(`${API_BASE}/executions?limit=${limit}`)
  if (!res.ok) throw new Error('获取执行历史失败')
  const data = await res.json()
  return data.executions
}

export async function apiGetPermissions(): Promise<Permission[]> {
  const res = await fetch(`${API_BASE}/permissions`)
  if (!res.ok) throw new Error('获取权限列表失败')
  const data = await res.json()
  return data.permissions
}

export async function apiCreatePermission(params: Partial<Permission>): Promise<Permission> {
  const res = await fetch(`${API_BASE}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `创建权限失败 (${res.status})`)
  }
  const data = await res.json()
  return data.permission
}

export async function apiUpdatePermission(id: string, data: Partial<Permission>): Promise<{ permission: Permission; copied_from?: string }> {
  const res = await fetch(`${API_BASE}/permissions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '更新权限失败')
  }
  return res.json()
}

export async function apiDeletePermission(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/permissions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `删除权限失败 (${res.status})`)
  }
}

export async function apiBrowseDirectory(path?: string): Promise<BrowseResult> {
  const params = path ? `?path=${encodeURIComponent(path)}` : ''
  const res = await fetch(`${API_BASE}/browse${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '浏览目录失败')
  }
  return res.json()
}

export async function apiUploadFile(workspaceId: string, file: File, path?: string): Promise<{ path: string; size: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const params = new URLSearchParams({ workspace_id: workspaceId })
  if (path) params.set('path', path)
  const res = await fetch(`${API_BASE}/workspace/file/upload?${params}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '上传文件失败')
  }
  return res.json()
}

export async function apiDownloadFile(workspaceId: string, path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/workspace/file/download?workspace_id=${workspaceId}&path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error('下载文件失败')
  return res.blob()
}

export interface StreamCallbacks {
  onStdout?: (line: string) => void
  onStderr?: (line: string) => void
  onDone?: (exitCode: number, durationMs: number, success: boolean) => void
  onError?: (message: string) => void
}

export async function apiExecuteStream(
  params: { code: string; language: string; timeout?: number; workspace_id?: string; permission_id?: string },
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${API_BASE}/execute/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || '流式执行失败')
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.type === 'stdout') callbacks.onStdout?.(event.data)
        else if (event.type === 'stderr') callbacks.onStderr?.(event.data)
        else if (event.type === 'done') callbacks.onDone?.(event.exit_code, event.duration_ms, event.success)
        else if (event.type === 'error') callbacks.onError?.(event.data)
      } catch { /* ignore malformed lines */ }
    }
  }
}
