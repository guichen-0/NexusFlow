import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
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

  // 会话管理
  createSession: () => string
  switchSession: (id: string) => void
  deleteSession: (id: string) => void
  clearAllSessions: () => void

  // 消息发送
  sendMessage: (content: string) => Promise<void>

  // 内部
  setActiveSessionId: (id: string | null) => void
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function truncateTitle(content: string): string {
  return content.length > 30 ? content.slice(0, 30) + '...' : content
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isLoading: false,
      streamingContent: '',

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
        set({ activeSessionId: id, streamingContent: '' })
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

      sendMessage: async (content: string) => {
        const state = get()
        let sessionId = state.activeSessionId

        // 如果没有活跃会话，自动创建一个
        if (!sessionId) {
          sessionId = get().createSession()
        }

        const settings = useSettingsStore.getState()
        const { useMockMode, apiKey, apiBaseUrl, selectedModel } = settings

        // 构建用户消息
        const userMsg: ChatMessage = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: Date.now(),
        }

        // 更新会话，加入用户消息，更新标题（如果是第一条消息）
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

        if (useMockMode) {
          // Mock 模式：模拟延迟后生成回复
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

        // 真实 API 模式
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
          // 构造 API 消息列表（带上下文）
          const currentSession = get().sessions.find(s => s.id === sessionId)
          const apiMessages = (currentSession?.messages || []).map(m => ({
            role: m.role,
            content: m.content,
          }))

          // 调用代理
          const response = await fetch('/api/ai-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-AI-Target': apiBaseUrl.replace(/\/+$/, ''),
              'X-AI-Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: apiMessages,
              stream: true,
            }),
          })

          if (!response.ok) {
            const errText = await response.text()
            let errMsg = `API 错误 (${response.status})`
            try {
              const parsed = JSON.parse(errText)
              errMsg = parsed.error?.message || parsed.message || errMsg
            } catch {
              errMsg += `: ${errText.slice(0, 200)}`
            }
            throw new Error(errMsg)
          }

          // SSE 流式读取
          const reader = response.body?.getReader()
          if (!reader) throw new Error('无法读取响应流')

          const decoder = new TextDecoder()
          let fullContent = ''
          let buffer = ''

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
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  fullContent += delta
                  set({ streamingContent: fullContent })
                }
              } catch {
                // 跳过无法解析的行
              }
            }
          }

          // 流式结束，将完整消息写入会话
          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
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
          }))
        } catch (error) {
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
          }))
        }
      },
    }),
    {
      name: 'nexusflow-chats',
      // 不持久化 loading/streaming 状态
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)

/** Mock 模式：根据用户输入生成模拟回复 */
function generateMockReply(userInput: string): string {
  const lower = userInput.toLowerCase()

  if (lower.includes('代码') || lower.includes('code') || lower.includes('开发') || lower.includes('实现')) {
    return `好的，收到你的需求：「${userInput}」

这是一个开发类任务，以下是我的分析和建议：

**技术选型建议**
- 前端：React + TypeScript + Tailwind CSS
- 后端：FastAPI（Python）或 Express（Node.js）
- 数据库：PostgreSQL + Redis（缓存）

**实现步骤**
1. 初始化项目结构，配置开发环境
2. 设计数据模型和 API 接口
3. 实现核心业务逻辑
4. 编写单元测试和集成测试
5. 部署配置

> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
  }

  if (lower.includes('翻译') || lower.includes('translate')) {
    return `收到翻译需求：「${userInput}」

请告诉我：
1. **源语言**是什么？
2. **目标语言**是什么？
3. 需要翻译的内容是文本、文档还是网页？

提供这些信息后，我可以帮你完成翻译工作。

> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
  }

  return `收到你的消息：「${userInput}」

我理解你的需求。作为 AI 助手，我可以帮你：

- **代码开发**：生成可运行的项目代码
- **内容创作**：写文章、报告、邮件等
- **数据分析**：处理和可视化数据
- **翻译**：多语言互译
- **问答**：回答各类问题

请告诉我更具体的需求，我会给出详细方案。

> 当前为 Mock 模式，切换到真实 API 可获得 AI 实际生成的内容。`
}
