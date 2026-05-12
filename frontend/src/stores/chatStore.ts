import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'
import { useSkillStore } from './skillStore'

// ======= 模块级请求管理（独立于组件生命周期） =======
let _activeController: AbortController | null = null
let _activeFetchInProgress = false

export function getActiveRequestStatus() {
  return { inProgress: _activeFetchInProgress }
}

export function cancelCurrentRequest() {
  if (_activeController) {
    _activeController.abort()
    _activeController = null
    _activeFetchInProgress = false
  }
}

export interface CodeExecution {
  language: string
  exit_code: number
  stdout: string
  stderr: string
  duration_ms: number
  success: boolean
  timed_out: boolean
}

export interface AgentPipelineBlock {
  agent_id: string
  agent_name: string
  role: string
  output: string
  tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  status: 'completed' | 'error'
  error?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  executions?: CodeExecution[]
  thinkingContent?: string
  agentPipeline?: AgentPipelineBlock[]  // Agent 流水线结果
  isAgentResult?: boolean
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  isLoading: boolean
  streamingContent: string
  streamingThinkingContent: string
  agentMode: boolean
  activeSkillId: string | null  // 会话级 Skill

  // 会话管理
  createSession: () => string
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  clearAllSessions: () => void

  // 消息发送
  sendMessage: (content: string, files?: { name: string; type: string; content?: string; path?: string }[], messageSkillId?: string | null) => Promise<void>

  // 取消当前请求
  cancelRequest: () => void

  // Agent 模式
  setAgentMode: (enabled: boolean) => void

  // Skill
  setActiveSkill: (id: string | null) => void

  // 内部
  setActiveSessionId: (id: string | null) => void
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function truncateTitle(content: string): string {
  return content.length > 30 ? content.slice(0, 30) + '...' : content
}

const BACKEND_BASE = '/api/backend/v1'

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      streamingContent: '',
      streamingThinkingContent: '',
      agentMode: false,
      activeSkillId: null,

      createSession: () => {
        const id = generateId()
        const session: ChatSession = {
          id,
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set(state => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
        }))
        return id
      },

      switchSession: (id) => {
        if (_activeFetchInProgress) {
          cancelCurrentRequest()
        }
        set({ activeSessionId: id, streamingContent: '', streamingThinkingContent: '' })
      },

      deleteSession: (id) => {
        set(state => {
          const filtered = state.sessions.filter(s => s.id !== id)
          const newActiveId =
            state.activeSessionId === id
              ? filtered.length > 0 ? filtered[0].id : null
              : state.activeSessionId
          return { sessions: filtered, activeSessionId: newActiveId }
        })
      },

      clearAllSessions: () => {
        set({ sessions: [], activeSessionId: null })
      },

      setActiveSessionId: (id) => {
        set({ activeSessionId: id })
      },

      setAgentMode: (enabled) => {
        set({ agentMode: enabled })
      },

      setActiveSkill: (id) => {
        set({ activeSkillId: id })
      },

      cancelRequest: () => {
        cancelCurrentRequest()
        set({ isLoading: false, streamingContent: '', streamingThinkingContent: '' })
      },

      sendMessage: async (content: string, files?: { name: string; type: string; content?: string; path?: string }[], messageSkillId?: string | null) => {
        if (_activeFetchInProgress) {
          cancelCurrentRequest()
        }

        const state = get()
        let sessionId = state.activeSessionId

        if (!sessionId) {
          sessionId = get().createSession()
        }

        const settings = useSettingsStore.getState()
        const { useMockMode, apiKey, apiBaseUrl, apiFormat, selectedModel, thinkingMode } = settings

        // 构建用户消息内容
        let fullContent = content
        if (files && files.length > 0) {
          const fileParts: string[] = []
          for (const file of files) {
            if (file.type === 'error') continue
            if (file.type === 'text' && file.content) {
              fileParts.push(`[文件: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\``)
            } else if (file.type === 'image' && file.path) {
              fileParts.push(`[图片: ${file.name} (${file.path})]`)
            }
          }
          if (fileParts.length > 0) {
            fullContent = content
              ? `${content}\n\n${fileParts.join('\n\n')}`
              : fileParts.join('\n\n')
          }
        }

        const userMsg: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: fullContent,
          timestamp: Date.now(),
        }

        set(state => {
          const sessions = state.sessions.map(s => {
            if (s.id !== sessionId) return s
            const isFirst = s.messages.length === 0
            return {
              ...s,
              title: isFirst ? truncateTitle(content) : s.title,
              messages: [...s.messages, userMsg],
              updatedAt: Date.now(),
            }
          })
          return { sessions, isLoading: true, streamingContent: '' }
        })

        // ========== Agent 模式 ==========
        if (state.agentMode) {
          const skillPrompt = useSkillStore.getState().resolvePrompt(state.activeSkillId, messageSkillId)
          await _runAgentPipeline(sessionId, fullContent, apiKey, apiBaseUrl, apiFormat, selectedModel, set, get, skillPrompt)
          return
        }

        // ========== Mock 模式 ==========
        if (useMockMode) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const mockReply: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: generateMockReply(content),
            timestamp: Date.now(),
          }
          set(state => ({
            sessions: state.sessions.map(s =>
              s.id !== sessionId ? s : {
                ...s,
                messages: [...s.messages, mockReply],
                updatedAt: Date.now(),
              }
            ),
            isLoading: false,
          }))
          return
        }

        // ========== 普通聊天模式 ==========
        if (!apiKey) {
          const errorMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: '⚠️ 未配置 API Key，请前往「设置」页面填写。',
            timestamp: Date.now(),
          }
          set(state => ({
            sessions: state.sessions.map(s =>
              s.id !== sessionId ? s : { ...s, messages: [...s.messages, errorMsg] }
            ),
            isLoading: false,
          }))
          return
        }

        try {
          const currentSession = get().sessions.find(s => s.id === sessionId)
          const apiMessages = (currentSession?.messages || []).map(m => ({
            role: m.role,
            content: m.content,
          }))

          // 注入 Skill system_prompt（优先级：message > session > global）
          const skillPrompt = useSkillStore.getState().resolvePrompt(state.activeSkillId, messageSkillId)
          if (skillPrompt) {
            apiMessages.unshift({ role: 'system', content: skillPrompt })
          }

          _activeController = new AbortController()
          _activeFetchInProgress = true
          const signal = _activeController.signal

          const response = await fetch(`${BACKEND_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              messages: apiMessages,
              stream: true,
              api_key: apiKey,
              api_base_url: apiBaseUrl,
              api_format: apiFormat,
              thinking_mode: thinkingMode,
            }),
            signal,
          })

          if (!response.ok) {
            const errText = await response.text()
            let errMsg = `API 错误 (${response.status})`
            try {
              const parsed = JSON.parse(errText)
              errMsg = parsed.detail || parsed.error?.message || errMsg
            } catch {
              errMsg += `: ${errText.slice(0, 200)}`
            }
            throw new Error(errMsg)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error('无法读取响应流')

          const decoder = new TextDecoder()
          let fullContent = ''
          let fullThinking = ''
          let buffer = ''
          let pendingExecutions: CodeExecution[] = []

          set({ streamingContent: '', streamingThinkingContent: '' })

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
                if (parsed.type === 'executions' && parsed.results) {
                  pendingExecutions = pendingExecutions.concat(parsed.results)
                  continue
                }
                if (parsed.type === 'thinking' && parsed.content) {
                  fullThinking += parsed.content
                  set({ streamingThinkingContent: fullThinking })
                  continue
                }
                if (parsed.error) {
                  throw new Error(parsed.error.message || JSON.stringify(parsed.error))
                }
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  set({ streamingContent: fullContent })
                }
              } catch (e) {
                if (e instanceof Error && e.message !== '无法解析的 SSE 数据') throw e
              }
            }
          }

          _activeController = null
          _activeFetchInProgress = false
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
            executions: pendingExecutions.length > 0 ? pendingExecutions : undefined,
            thinkingContent: fullThinking || undefined,
          }

          set(state => ({
            sessions: state.sessions.map(s =>
              s.id !== sessionId ? s : {
                ...s,
                messages: [...s.messages, assistantMsg],
                updatedAt: Date.now(),
              }
            ),
            isLoading: false,
            streamingContent: '',
            streamingThinkingContent: '',
          }))
        } catch (error) {
          _activeController = null
          _activeFetchInProgress = false

          if (error instanceof DOMException && error.name === 'AbortError') {
            set({ isLoading: false, streamingContent: '', streamingThinkingContent: '' })
            return
          }

          const errMsg = error instanceof Error ? error.message : '未知错误'
          const errorReply: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: `⚠️ 请求失败：${errMsg}`,
            timestamp: Date.now(),
          }
          set(state => ({
            sessions: state.sessions.map(s =>
              s.id !== sessionId ? s : {
                ...s,
                messages: [...s.messages, errorReply],
              }
            ),
            isLoading: false,
            streamingContent: '',
            streamingThinkingContent: '',
          }))
        }
      },
    }),
    {
      name: 'nexusflow-chats',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        activeSkillId: state.activeSkillId,
      }),
    }
  )
)


// ========== Agent Pipeline 执行 ==========
async function _runAgentPipeline(
  sessionId: string,
  content: string,
  apiKey: string,
  apiBaseUrl: string,
  apiFormat: string,
  model: string,
  set: any,
  get: () => ChatState,
  skillPrompt?: string | null,
) {
  if (!apiKey) {
    const errorMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '⚠️ Agent 模式需要 API Key，请前往「设置」页面填写。',
      timestamp: Date.now(),
    }
    set((state: ChatState) => ({
      sessions: state.sessions.map(s =>
        s.id !== sessionId ? s : { ...s, messages: [...s.messages, errorMsg] }
      ),
      isLoading: false,
    }))
    return
  }

  try {
    _activeController = new AbortController()
    _activeFetchInProgress = true
    const signal = _activeController.signal

    set({ streamingContent: '🤖 Agent 团队协作中...' })

    const response = await fetch(`${BACKEND_BASE}/agents/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: content,
        api_key: apiKey,
        api_base_url: apiBaseUrl,
        api_format: apiFormat,
        model: model,
        system_prompt: skillPrompt || '',
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
    const pipelineBlocks: AgentPipelineBlock[] = []
    let currentAgentName = ''

    set({ streamingContent: '' })

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

          if (event.type === 'agent_start') {
            currentAgentName = event.agent_name
            set({ streamingContent: `🤖 ${event.agent_name}（${event.role}）正在执行...` })
          }

          if (event.type === 'agent_complete') {
            pipelineBlocks.push({
              agent_id: event.agent_id,
              agent_name: event.agent_name,
              role: '',
              output: event.output,
              tokens: event.tokens,
              status: 'completed',
            })
            set({ streamingContent: `✅ ${event.agent_name} 完成` })
          }

          if (event.type === 'agent_skipped') {
            pipelineBlocks.push({
              agent_id: event.agent_id,
              agent_name: event.agent_name,
              role: '',
              output: `（跳过: ${event.reason || '不需要'}）`,
              status: 'completed',
            })
          }

          if (event.type === 'agent_error') {
            pipelineBlocks.push({
              agent_id: event.agent_id,
              agent_name: event.agent_name,
              role: '',
              output: '',
              status: 'error',
              error: event.error,
            })
          }

          if (event.type === 'pipeline_plan') {
            set({ streamingContent: `📋 计划: ${event.steps?.join(' → ') || ''}` })
          }

          if (event.type === 'pipeline_complete') {
            // 构建最终消息
            const totalTok = event.total_tokens || { prompt: 0, completion: 0, total: 0 }
            const summary = pipelineBlocks
              .filter(b => b.status === 'completed')
              .map(b => `**${b.agent_name}**\n${b.output}`)
              .join('\n\n---\n\n')

            const finalMsg: ChatMessage = {
              id: generateId(),
              role: 'assistant',
              content: summary || 'Agent 团队执行完成，但没有输出结果。',
              timestamp: Date.now(),
              isAgentResult: true,
              agentPipeline: pipelineBlocks,
            }

            set((state: ChatState) => ({
              sessions: state.sessions.map(s =>
                s.id !== sessionId ? s : {
                  ...s,
                  messages: [...s.messages, finalMsg],
                  updatedAt: Date.now(),
                }
              ),
              isLoading: false,
              streamingContent: '',
              streamingThinkingContent: '',
            }))
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch (error) {
    _activeController = null
    _activeFetchInProgress = false

    if (error instanceof DOMException && error.name === 'AbortError') {
      set({ isLoading: false, streamingContent: '', streamingThinkingContent: '' })
      return
    }

    const errMsg = error instanceof Error ? error.message : '未知错误'
    const errorReply: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `⚠️ Agent 团队执行失败：${errMsg}`,
      timestamp: Date.now(),
    }
    set((state: ChatState) => ({
      sessions: state.sessions.map(s =>
        s.id !== sessionId ? s : {
          ...s,
          messages: [...s.messages, errorReply],
        }
      ),
      isLoading: false,
      streamingContent: '',
      streamingThinkingContent: '',
    }))
  } finally {
    _activeController = null
    _activeFetchInProgress = false
  }
}


/** Mock 模式：根据用户输入生成模拟回复 */
function generateMockReply(userInput: string): string {
  const lower = userInput.toLowerCase()

  if (lower.includes('代码') || lower.includes('code') || lower.includes('开发') || lower.includes('实现')) {
    return `好的，收到你的需求：「${userInput}」\n\n这是一个开发类任务，以下是我的分析和建议：\n\n**技术选型建议**\n- 前端：React + TypeScript + Tailwind CSS\n- 后端：FastAPI（Python）或 Express（Node.js）\n- 数据库：PostgreSQL + Redis（缓存）\n\n**实现步骤**\n1. 初始化项目结构，配置开发环境\n2. 设计数据模型和 API 接口\n3. 实现核心业务逻辑\n4. 编写单元测试和集成测试\n5. 部署配置\n\n> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
  }

  if (lower.includes('翻译') || lower.includes('translate')) {
    return `收到翻译需求：「${userInput}」\n\n请告诉我：\n1. **源语言**是什么？\n2. **目标语言**是什么？\n3. 需要翻译的内容是文本、文档还是网页？\n\n提供这些信息后，我可以帮你完成翻译工作。\n\n> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
  }

  return `收到你的消息：「${userInput}」\n\n我理解你的需求。作为 AI 助手，我可以帮你：\n\n- **代码开发**：生成可运行的项目代码\n- **内容创作**：写文章、报告、邮件等\n- **数据分析**：处理和可视化数据\n- **翻译**：多语言互译\n- **问答**：回答各类问题\n\n请告诉我更具体的需求，我会给出详细方案。\n\n> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
}
