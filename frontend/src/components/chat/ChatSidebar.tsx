import type { ChatSession } from '../../stores'
import { MessageSquarePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onDelete,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-60 border-r border-border flex flex-col h-full bg-surface/30">
      {/* 标题 + 新建 */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">对话</h3>
        <button
          onClick={onCreate}
          className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
          title="新建对话"
        >
          <MessageSquarePlus className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <p className="text-xs text-text-muted text-center py-8 px-3">
            暂无对话，点击 + 开始新对话
          </p>
        )}
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            onMouseEnter={() => setHoveredId(session.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${
              activeSessionId === session.id
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-surface-2'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{session.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatTime(session.updatedAt)}
                  {' · '}
                  {session.messages.length} 条消息
                </p>
              </div>
              {(hoveredId === session.id || activeSessionId === session.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  className="w-5 h-5 rounded shrink-0 flex items-center justify-center hover:bg-danger/10 hover:text-danger transition-colors mt-0.5"
                  title="删除对话"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
