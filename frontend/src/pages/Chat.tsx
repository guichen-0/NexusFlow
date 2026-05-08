import { useEffect, useRef, useCallback } from 'react'
import { useChatStore, type ChatMessage } from '../stores'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ChatSidebar from '../components/chat/ChatSidebar'

export default function Chat() {
  const {
    sessions,
    activeSessionId,
    isLoading,
    streamingContent,
    createSession,
    switchSession,
    deleteSession,
    sendMessage,
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = useCallback((content: string) => {
    sendMessage(content)
  }, [sendMessage])

  const handleNewChat = () => {
    createSession()
  }

  const handleSelectSession = (id: string) => {
    switchSession(id)
  }

  const handleDeleteSession = (id: string) => {
    deleteSession(id)
  }

  return (
    <div className="flex h-full animate-in">
      {/* 左侧会话列表 */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onCreate={handleNewChat}
        onDelete={handleDeleteSession}
      />

      {/* 右侧消息区域 */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {!activeSessionId ? (
          /* 空状态：未选择会话 */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              NexusFlow 聊天助手
            </h3>
            <p className="text-sm text-text-secondary max-w-sm">
              选择一个已有对话，或开始新对话。支持多轮对话，AI 会记住上下文。
            </p>
            <button
              onClick={handleNewChat}
              className="mt-6 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              开始新对话
            </button>
          </div>
        ) : (
          <>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  发送一条消息开始对话
                </div>
              )}
              {messages.map(msg => (
                <ChatMessageComponent
                  key={msg.id}
                  role={msg.role === 'assistant' ? 'assistant' : 'user'}
                  content={msg.content}
                />
              ))}

              {/* 流式输出中的临时消息 */}
              {isLoading && streamingContent && (
                <ChatMessageComponent
                  role="assistant"
                  content={streamingContent}
                  isStreaming
                />
              )}

              {/* 加载中但还没收到内容 */}
              {isLoading && !streamingContent && (
                <div className="flex gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="bg-surface-2 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-text-muted">
                    正在思考...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </>
        )}
      </div>
    </div>
  )
}
