import { create } from 'zustand'
import { Task } from '../types/workflow'
import { useSettingsStore } from './settingsStore'

const STORAGE_KEY = 'nexusflow-tasks'

function persistTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

/**
 * Mock 模式下生成与任务输入相关的模拟输出
 */
function generateMockOutput(task: Task): string {
  const now = new Date().toLocaleString('zh-CN')
  const input = task.input_text

  // 根据输入文本智能生成相关内容
  const lines = [
    `## 任务执行报告`,
    ``,
    `- **任务 ID**: ${task.id}`,
    `- **需求**: ${input}`,
    `- **状态**: 已完成（Mock 模式）`,
    `- **完成时间**: ${now}`,
    ``,
    `---`,
    ``,
    `### 需求分析`,
    ``,
    `根据您提供的需求「${input}」，系统已完成初步分析和任务拆解。以下是模拟执行结果：`,
    ``,
    `### 执行摘要`,
    ``,
  ]

  // 根据输入关键词生成相关内容
  const lowerInput = input.toLowerCase()
  if (lowerInput.includes('代码') || lowerInput.includes('code') || lowerInput.includes('开发') || lowerInput.includes('功能')) {
    lines.push(
      `- **技术栈分析**: 已识别到代码开发相关需求`,
      `- **架构设计**: 建议采用模块化分层架构`,
      `- **核心模块**: 共拆分为 3-5 个功能模块`,
      ``,
      `### 实现方案`,
      ``,
      `1. **基础框架搭建**: 初始化项目结构，配置开发环境`,
      `2. **核心逻辑实现**: 实现主要业务逻辑和数据处理`,
      `3. **接口与交互**: 设计 API 接口或用户界面`,
      `4. **测试验证**: 编写单元测试和集成测试`,
      `5. **优化部署**: 性能优化和生产环境部署`,
      ``,
      `> 提示：当前为 Mock 模式，以上为模拟输出。切换到真实 API 模式可获得 AI 实际生成的内容。`,
    )
  } else if (lowerInput.includes('数据') || lowerInput.includes('训练') || lowerInput.includes('dataset')) {
    lines.push(
      `- **数据规模评估**: 根据需求生成模拟数据集`,
      `- **质量标准**: 已定义数据质量验证规则`,
      `- **覆盖范围**: 确保数据多样性和完整性`,
      ``,
      `### 数据集概览`,
      ``,
      `| 指标 | 数值 |`,
      `|------|------|`,
      `| 总样本数 | ~500 条 |`,
      `| 有效样本 | ~485 条 (97%) |`,
      `| 字段数 | 8-12 个 |`,
      `| 数据增强 | 已应用 |`,
      ``,
      `> 提示：当前为 Mock 模式，以上为模拟输出。切换到真实 API 模式可获得 AI 实际生成的内容。`,
    )
  } else if (lowerInput.includes('文章') || lowerInput.includes('写') || lowerInput.includes('内容') || lowerInput.includes('翻译')) {
    lines.push(
      `- **内容类型**: 已识别为内容创作类需求`,
      `- **目标受众**: 通用技术读者`,
      `- **内容结构**: 引言 → 核心内容 → 总结`,
      ``,
      `### 内容大纲`,
      ``,
      `1. **引言部分**: 介绍主题背景和核心观点`,
      `2. **核心论述**: 分 3-4 个子主题展开讨论`,
      `3. **案例/示例**: 配合具体案例增强说服力`,
      `4. **总结展望**: 归纳要点并展望未来趋势`,
      ``,
      `> 提示：当前为 Mock 模式，以上为模拟输出。切换到真实 API 模式可获得 AI 实际生成的内容。`,
    )
  } else {
    lines.push(
      `- **任务类型**: 通用 AI 任务`,
      `- **复杂度**: 中等`,
      `- **预估步骤**: 3-5 个阶段`,
      ``,
      `### 执行步骤`,
      ``,
      `1. **需求解析**: 理解并拆解原始需求`,
      `2. **方案设计**: 制定执行方案和步骤`,
      `3. **逐步执行**: 按计划执行各个子任务`,
      `4. **质量检查**: 验证输出结果的质量`,
      `5. **结果输出**: 整理并呈现最终结果`,
      ``,
      `> 提示：当前为 Mock 模式，以上为模拟输出。切换到真实 API 模式可获得 AI 实际生成的内容。`,
    )
  }

  lines.push(``, `---`, ``, `*本报告由 NexusFlow Mock 模式生成*`)
  return lines.join('\n')
}

/**
 * 真实模式下调用 OpenAI 兼容 API（流式）
 * 通过 Vite 代理转发请求，避免浏览器 CORS 限制
 */
async function callAI_API(
  baseUrl: string,
  apiKey: string,
  model: string,
  inputText: string,
  onProgress: (progress: number, partialOutput: string) => void,
): Promise<string> {
  const response = await fetch('/api/ai-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Target': baseUrl.replace(/\/+$/, ''),
      'X-AI-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: '你是 NexusFlow AI 助手。用户会向你发送任务需求，请认真分析并给出详细、有用的回复。直接回答用户的问题，不需要额外格式。'
        },
        {
          role: 'user',
          content: inputText,
        }
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `API 请求失败 (${response.status})`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage
      // 如果代理返回了 hint，追加到错误信息
      if (errorJson.error?.hint) {
        errorMessage += `\n\n${errorJson.error.hint}`
      }
    } catch {
      errorMessage += `: ${errorText.slice(0, 300)}`
    }
    throw new Error(errorMessage)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''
  // 预估步数，用于计算进度
  let estimatedTokens = 100
  let collectedTokens = 0

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
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          fullContent += delta
          collectedTokens++
          const progress = Math.min(95, Math.round((collectedTokens / estimatedTokens) * 100))
          onProgress(progress, fullContent)
        }
      } catch {
        // 跳过无法解析的行
      }
    }
  }

  return fullContent
}

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

  setTasks: (tasks) => { set({ tasks }); persistTasks(tasks) },

  addTask: (task) => set(state => {
    const updated = [task, ...state.tasks]
    persistTasks(updated)
    return { tasks: updated }
  }),

  updateTask: (taskId, updates) => set(state => {
    const updated = state.tasks.map(t =>
      t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    )
    persistTasks(updated)
    return {
      tasks: updated,
      currentTask: state.currentTask?.id === taskId
        ? { ...state.currentTask, ...updates }
        : state.currentTask
    }
  }),

  deleteTask: (taskId) => set(state => {
    const updated = state.tasks.filter(t => t.id !== taskId)
    persistTasks(updated)
    return {
      tasks: updated,
      currentTask: state.currentTask?.id === taskId ? null : state.currentTask
    }
  }),

  setCurrentTask: (task) => set({ currentTask: task }),

  loadTasks: async () => {
    set({ isLoading: true })
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try { set({ tasks: JSON.parse(saved) }) } catch { set({ tasks: [] }) }
      }
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
    get().addTask(task)
    return task
  },

  executeTask: async (taskId) => {
    set({ isExecuting: true })

    const task = get().tasks.find(t => t.id === taskId)
    if (!task) {
      set({ isExecuting: false })
      return
    }

    // 获取设置
    const settings = useSettingsStore.getState()
    const { useMockMode, apiKey, apiBaseUrl, selectedModel } = settings

    if (useMockMode) {
      // ===== Mock 模式 =====
      const startTime = Date.now()
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200))
        get().updateTask(taskId, {
          status: progress < 100 ? 'running' : 'completed',
          progress
        })
      }
      const output = generateMockOutput(task)
      const durationMs = Date.now() - startTime
      get().updateTask(taskId, { output, duration_ms: durationMs })
    } else {
      // ===== 真实 API 模式 =====
      if (!apiKey) {
        const output = `## 执行失败\n\n未配置 API Key。请前往「设置」页面填写 API Key 后重试。`
        get().updateTask(taskId, {
          status: 'failed',
          progress: 0,
          output
        })
        set({ isExecuting: false })
        return
      }

      get().updateTask(taskId, { status: 'running', progress: 0 })

      try {
        const startTime = Date.now()
        const fullContent = await callAI_API(
          apiBaseUrl,
          apiKey,
          selectedModel,
          task.input_text,
          (progress, partial) => {
            get().updateTask(taskId, {
              progress,
              output: partial ? `## AI 生成中...\n\n${partial}` : undefined
            })
          }
        )
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

        const finalOutput = [
          `## AI 回复`,
          ``,
          `> **模型**: ${selectedModel}`,
          `> **耗时**: ${elapsed}s`,
          ``,
          `---`,
          ``,
          fullContent,
        ].join('\n')

        get().updateTask(taskId, {
          status: 'completed',
          progress: 100,
          output: finalOutput,
          duration_ms: Date.now() - startTime
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        const errorOutput = [
          `## 执行失败`,
          ``,
          `> **模型**: ${selectedModel}`,
          `> **端点**: ${apiBaseUrl}`,
          ``,
          `**错误信息**:\n${message}`,
          ``,
          `---`,
          ``,
          `### 排查建议`,
          ``,
          `1. 检查 API Key 是否正确`,
          `2. 检查 Base URL 是否正确（如 \`https://api.openai.com/v1\`）`,
          `3. 检查网络连接是否正常`,
          `4. 检查模型名称是否受支持`,
          `5. 可在「设置」页面点击「测试连接」验证配置`,
        ].join('\n')
        get().updateTask(taskId, {
          status: 'failed',
          progress: 0,
          output: errorOutput
        })
      }
    }

    set({ isExecuting: false })
  }
}))
