import { create } from 'zustand'
import { Task } from '../types/workflow'
import { mockTasks } from '../services/mock'

interface TaskState {
  tasks: Task[]
  currentTask: Task | null
  isLoading: boolean
  isExecuting: boolean

  // 操作
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  deleteTask: (taskId: string) => void
  setCurrentTask: (task: Task | null) => void
  loadTasks: () => Promise<void>
  createTask: (inputText: string, workflowId?: string) => Promise<Task>
  executeTask: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  isExecuting: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set(state => ({
    tasks: [task, ...state.tasks]
  })),

  updateTask: (taskId, updates) => set(state => ({
    tasks: state.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    ),
    currentTask: state.currentTask?.id === taskId
      ? { ...state.currentTask, ...updates }
      : state.currentTask
  })),

  deleteTask: (taskId) => set(state => ({
    tasks: state.tasks.filter(task => task.id !== taskId),
    currentTask: state.currentTask?.id === taskId ? null : state.currentTask
  })),

  setCurrentTask: (task) => set({ currentTask: task }),

  loadTasks: async () => {
    set({ isLoading: true })
    try {
      // 使用 mock 数据
      set({ tasks: mockTasks })
    } finally {
      set({ isLoading: false })
    }
  },

  createTask: async (inputText, workflowId) => {
    const task: Task = {
      id: `task-${Date.now()}`,
      input_text: inputText,
      workflow_id: workflowId,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString()
    }
    set(state => ({ tasks: [task, ...state.tasks] }))
    return task
  },

  executeTask: async (taskId) => {
    set({ isExecuting: true })

    // 模拟执行过程
    const updateProgress = async () => {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 300))
        get().updateTask(taskId, {
          status: progress < 100 ? 'running' : 'completed',
          progress
        })
      }
    }

    await updateProgress()
    set({ isExecuting: false })
  }
}))
