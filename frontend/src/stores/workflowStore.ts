import { create } from 'zustand'
import { Workflow, NodeExecution } from '../types/workflow'
import { useSettingsStore } from './settingsStore'
import { workflowApi } from '../services/api'

interface WorkflowState {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  isLoading: boolean

  // 节点执行状态
  nodeExecutions: Record<string, NodeExecution>
  isExecuting: boolean

  // 操作
  setWorkflows: (workflows: Workflow[]) => void
  selectWorkflow: (workflow: Workflow | null) => void
  loadWorkflows: () => Promise<void>
  getWorkflow: (id: string) => Promise<Workflow | null>
  updateNodeExecution: (nodeId: string, execution: Partial<NodeExecution>) => void
  resetNodeExecutions: () => void
  executeWorkflow: (workflowId: string, task: string) => Promise<void>
  cancelExecution: () => void
}

let _abortController: AbortController | null = null

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflow: null,
  isLoading: false,
  nodeExecutions: {},
  isExecuting: false,

  setWorkflows: (workflows) => set({ workflows }),

  selectWorkflow: (workflow) => {
    set({ selectedWorkflow: workflow })
    if (workflow) {
      const executions: Record<string, NodeExecution> = {}
      workflow.nodes.forEach(node => {
        executions[node.id] = { node_id: node.id, status: 'pending' }
      })
      set({ nodeExecutions: executions })
    }
  },

  loadWorkflows: async () => {
    set({ isLoading: true })
    try {
      const workflows = await workflowApi.list()
      set({ workflows })
    } finally {
      set({ isLoading: false })
    }
  },

  getWorkflow: async (id: string) => {
    return workflowApi.get(id)
  },

  updateNodeExecution: (nodeId, execution) => {
    set(state => ({
      nodeExecutions: {
        ...state.nodeExecutions,
        [nodeId]: { ...state.nodeExecutions[nodeId], ...execution }
      }
    }))
  },

  resetNodeExecutions: () => set({ nodeExecutions: {} }),

  executeWorkflow: async (workflowId: string, task: string) => {
    const settings = useSettingsStore.getState()

    if (_abortController) _abortController.abort()
    _abortController = new AbortController()
    const signal = _abortController.signal

    set({ isExecuting: true })

    // 初始化所有节点为 pending
    const workflow = get().workflows.find(w => w.id === workflowId)
    if (workflow) {
      const executions: Record<string, NodeExecution> = {}
      workflow.nodes.forEach(n => { executions[n.id] = { node_id: n.id, status: 'pending' } })
      set({ nodeExecutions: executions })
    }

    try {
      const response = await fetch(`/api/backend/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          api_key: settings.apiKey,
          api_base_url: settings.apiBaseUrl,
          api_format: settings.apiFormat,
          model: settings.selectedModel,
        }),
        signal,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `请求失败 (${response.status})`)
      }

      const reader = response.body?.getReader()
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
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            switch (event.type) {
              case 'node_start':
                get().updateNodeExecution(event.node_id, { status: 'running', started_at: new Date().toISOString() })
                break
              case 'node_complete':
                get().updateNodeExecution(event.node_id, {
                  status: 'completed',
                  output: event.output,
                  tokens: event.tokens,
                  completed_at: new Date().toISOString()
                })
                break
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Workflow execution failed:', error)
    } finally {
      _abortController = null
      set({ isExecuting: false })
    }
  },

  cancelExecution: () => {
    if (_abortController) {
      _abortController.abort()
      _abortController = null
    }
    set({ isExecuting: false })
  }
}))
