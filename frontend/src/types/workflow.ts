export interface WorkflowNode {
  id: string
  type: string
  label: string
  depends_on: string[]
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  category: string
  created_at: string
}

export interface NodeExecution {
  node_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
  model?: string
  tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  started_at?: string
  completed_at?: string
}

export interface Task {
  id: string
  input_text: string
  workflow_id?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  result?: Record<string, unknown>
  created_at: string
  updated_at?: string
}
