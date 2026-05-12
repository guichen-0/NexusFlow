import { create } from 'zustand'
import { useSettingsStore } from './settingsStore'
import type { Agent, PipelineResult } from '../types/agent'

interface AgentState {
  agents: Agent[]
  isRunning: boolean
  currentAgentId: string | null
  pipelineResults: PipelineResult | null
  totalTokens: { prompt: number; completion: number } | null
  taskInput: string

  // 操作
  setTaskInput: (input: string) => void
  resetAgents: () => void
  orchestrate: (task: string) => Promise<void>
  cancelOrchestrate: () => void
}

const IDLE_AGENTS: Agent[] = [
  { id: 'analyze', name: '需求分析 Agent', role: '需求理解专家', status: 'idle' },
  { id: 'generate', name: '代码生成 Agent', role: '全栈开发专家', status: 'idle' },
  { id: 'review', name: '代码审查 Agent', role: '代码质量专家', status: 'idle' },
  { id: 'fix', name: '自动修复 Agent', role: '调试修复专家', status: 'idle' },
  { id: 'report', name: '报告生成 Agent', role: '文档编写专家', status: 'idle' },
]

let _abortController: AbortController | null = null

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: IDLE_AGENTS.map(a => ({ ...a })),
  isRunning: false,
  currentAgentId: null,
  pipelineResults: null,
  totalTokens: null,
  taskInput: '',

  setTaskInput: (input) => set({ taskInput: input }),

  resetAgents: () => {
    get().cancelOrchestrate()
    set({
      agents: IDLE_AGENTS.map(a => ({ ...a })),
      isRunning: false,
      currentAgentId: null,
      pipelineResults: null,
      totalTokens: null,
    })
  },

  cancelOrchestrate: () => {
    if (_abortController) {
      _abortController.abort()
      _abortController = null
    }
    set({ isRunning: false, currentAgentId: null })
  },

  orchestrate: async (task: string) => {
    const settings = useSettingsStore.getState()
    if (!settings.apiKey) {
      return
    }

    // 取消之前的请求
    if (_abortController) {
      _abortController.abort()
    }
    _abortController = new AbortController()
    const signal = _abortController.signal

    // 初始化 agents
    set({
      agents: IDLE_AGENTS.map(a => ({ ...a, status: 'idle' as const })),
      isRunning: true,
      currentAgentId: null,
      pipelineResults: null,
      totalTokens: null,
      taskInput: task,
    })

    try {
      const response = await fetch('/api/backend/v1/agents/orchestrate', {
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
        let errMsg = `请求失败 (${response.status})`
        try {
          const parsed = JSON.parse(errText)
          errMsg = parsed.detail || errMsg
        } catch {
          errMsg += `: ${errText.slice(0, 200)}`
        }
        throw new Error(errMsg)
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
            handleAgentEvent(event, set as any, get)
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        set({ isRunning: false, currentAgentId: null })
        return
      }
      console.error('Agent orchestration failed:', error)
    } finally {
      _abortController = null
      set({ isRunning: false, currentAgentId: null })
    }
  },
}))

function handleAgentEvent(
  event: any,
  set: any,
  get: () => AgentState,
) {
  switch (event.type) {
    case 'agent_start':
      set((state: AgentState) => ({
        currentAgentId: event.agent_id,
        agents: state.agents.map(a =>
          a.id === event.agent_id
            ? { ...a, status: 'working' as const, current_thought: '正在执行...', output: undefined, error: undefined }
            : a.status === 'completed' || a.status === 'working'
              ? a
              : a
        ),
      }))
      break

    case 'agent_complete':
      set((state: AgentState) => ({
        agents: state.agents.map(a =>
          a.id === event.agent_id
            ? {
                ...a,
                status: 'completed' as const,
                output: event.output,
                tokens: event.tokens,
                current_thought: undefined,
              }
            : a
        ),
      }))
      break

    case 'agent_error':
      set((state: AgentState) => ({
        agents: state.agents.map(a =>
          a.id === event.agent_id
            ? {
                ...a,
                status: 'error' as const,
                error: event.error,
                current_thought: undefined,
              }
            : a
        ),
      }))
      break

    case 'pipeline_complete':
      set(() => ({
        pipelineResults: event.results,
        totalTokens: event.total_tokens,
      }))
      break
  }
}
