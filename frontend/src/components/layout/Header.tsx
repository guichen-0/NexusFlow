import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Search, Bell, ChevronRight, Github, X } from 'lucide-react'

const routeTitles: Record<string, string> = {
  '/': '工作台',
  '/workflows': '工作流模板',
  '/tasks': '任务列表',
  '/agents': 'Agent 团队',
  '/analytics': '数据分析',
  '/settings': '设置'
}

const mockNotifications = [
  { id: 1, title: '任务完成', desc: '自动代码工厂 执行成功', time: '2分钟前', read: false },
  { id: 2, title: '新工作流可用', desc: '内容创作流水线 已更新', time: '1小时前', read: false },
  { id: 3, title: '系统通知', desc: 'API Key 已配置完成', time: '3小时前', read: true },
]

export function Header() {
  const location = useLocation()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)
  // 匹配 /workflows/:id 的情况
  const isWorkflowEditor = location.pathname.startsWith('/workflows/') && location.pathname !== '/workflows'
  const title = isWorkflowEditor ? '工作流编辑器' : (routeTitles[location.pathname] || 'NexusFlow')

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
      {/* Left: Title & Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-text-primary font-medium">{title}</span>
        <ChevronRight className="w-4 h-4 text-text-muted" />
        <span className="text-text-secondary text-sm">概览</span>
      </div>

      {/* Right: Search, GitHub & Notifications */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索任务、工作流..."
            className="w-64 pl-10 pr-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* GitHub Link */}
        <a
          href="https://github.com/lzw-DDS/NexusFlow"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <Github className="w-5 h-5 text-text-secondary hover:text-text-primary" />
        </a>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>

          {/* Notification Panel */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-[99]"
                onClick={() => setShowNotifications(false)}
              />
              <div className="fixed right-6 top-16 w-80 glass rounded-xl border border-border shadow-2xl shadow-black/40 z-[10000] animate-in">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-semibold text-text-primary">通知</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        全部已读
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded hover:bg-surface-2 transition-colors"
                    >
                      <X className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-border/30 hover:bg-surface-2/50 transition-colors cursor-pointer ${
                        !n.read ? 'bg-primary/3' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <div className={n.read ? 'pl-3.5' : ''}>
                          <p className="text-sm font-medium text-text-primary">{n.title}</p>
                          <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
                          <p className="text-[10px] text-text-muted mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-border">
                  <button className="text-xs text-text-muted hover:text-primary transition-colors">
                    查看全部通知
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
