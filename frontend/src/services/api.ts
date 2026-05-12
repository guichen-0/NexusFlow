import axios from 'axios'
import { Workflow, Task } from '../types/workflow'
import { mockWorkflowTemplates, mockTasks, mockAnalytics } from './mock'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('[API Error]', error.message)
    return Promise.reject(error)
  }
)

// 工作流 API
export const workflowApi = {
  list: async (): Promise<Workflow[]> => {
    try {
      const response = await api.get('/workflows/')
      return response.data
    } catch (error) {
      // 降级到 Mock 数据
      console.log('[API] Using mock data for workflows')
      return mockWorkflowTemplates
    }
  },

  get: async (id: string): Promise<Workflow | null> => {
    try {
      const response = await api.get(`/workflows/${id}`)
      return response.data
    } catch (error) {
      return mockWorkflowTemplates.find(w => w.id === id) || null
    }
  }
}

// 任务 API
export const taskApi = {
  list: async (): Promise<Task[]> => {
    try {
      const response = await api.get('/tasks')
      return response.data
    } catch (error) {
      console.log('[API] Using mock data for tasks')
      return mockTasks
    }
  },

  create: async (inputText: string, workflowId?: string): Promise<Task> => {
    try {
      const response = await api.post('/tasks', {
        input_text: inputText,
        workflow_id: workflowId
      })
      return response.data
    } catch (error) {
      // 模拟创建任务
      return {
        id: `task-${Date.now()}`,
        input_text: inputText,
        workflow_id: workflowId,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString()
      }
    }
  },

  get: async (id: string): Promise<Task | null> => {
    try {
      const response = await api.get(`/tasks/${id}`)
      return response.data
    } catch (error) {
      return mockTasks.find(t => t.id === id) || null
    }
  },

  execute: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await api.post(`/tasks/${id}/execute`)
      return response.data
    } catch (error) {
      return { message: 'Execution started (mock)' }
    }
  }
}

// 分析 API
export const analyticsApi = {
  getSummary: async () => {
    try {
      const response = await api.get('/analytics/summary')
      return response.data
    } catch (error) {
      return mockAnalytics
    }
  },

  getTokenUsage: async (days: number = 7) => {
    try {
      const response = await api.get('/analytics/token-usage', { params: { days } })
      return response.data
    } catch (error) {
      return { data: [] }
    }
  },

  getExecutionHistory: async (limit: number = 20) => {
    try {
      const response = await api.get('/analytics/execution-history', { params: { limit } })
      return response.data
    } catch (error) {
      return { history: [], total: 0 }
    }
  }
}

// Agent API
export const agentApi = {
  list: async () => {
    try {
      const response = await api.get('/agents')
      return response.data
    } catch (error) {
      return []
    }
  },

  orchestrate: async (workflowId: string, inputText: string) => {
    try {
      const response = await api.post('/agents/orchestrate', {
        workflow_id: workflowId,
        input_text: inputText
      })
      return response.data
    } catch (error) {
      return { workflow_id: workflowId, agents: [], status: 'completed' }
    }
  }
}

export default api
