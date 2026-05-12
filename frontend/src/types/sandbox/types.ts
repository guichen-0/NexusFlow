export interface Permission {
  id: string
  name: string
  description: string
  allow_network: boolean
  allow_filesystem: boolean
  allow_subprocess: boolean
  allow_env_vars: boolean
  allow_terminal: boolean
  allow_imports: string[]
  deny_imports: string[]
  max_timeout: number
  max_memory_mb: number
  max_output_size: number
  allowed_languages: string[]
  is_builtin: boolean
}

export interface Workspace {
  id: string
  path: string
  type: 'virtual' | 'local'
  file_count: number
  files: string[]
  total_size: number
  permission_id: string | null
  permission_name: string | null
  created_at: string
}

export interface ExecutionRecord {
  id: string
  code: string
  language: string
  permission_id: string | null
  permission_name: string | null
  workspace_id: string | null
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
  timed_out: boolean
  success: boolean
  executed_at: string
}

export interface ExecuteResult {
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
  timed_out: boolean
  files: string[]
  success: boolean
  permission_id?: string | null
  permission_name?: string | null
}

export interface BrowseEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
  error?: string
}

export interface BrowseResult {
  path: string
  parent: string | null
  entries: BrowseEntry[]
}
