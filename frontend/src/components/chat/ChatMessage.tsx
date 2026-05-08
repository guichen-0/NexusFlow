import { MessageCircle, User } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export default function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={`max-w-[70%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-surface-2 text-text-primary rounded-bl-md'
          }`}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-current align-text-bottom animate-pulse ml-0.5" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 order-2">
          <User className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  )
}
