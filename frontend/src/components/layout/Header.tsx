import { useLocation } from 'react-router-dom'
import { Search, Bell, ChevronRight, Github } from 'lucide-react'

const routeTitles: Record<string, string> = {
  '/': '工作台',
  '/workflows': '工作流模板',
  '/tasks': '任务列表',
  '/agents': 'Agent 团队',
  '/analytics': '数据分析',
  '/settings': '设置'
}

export function Header() {
  const location = useLocation()
  // 匹配 /workflows/:id 的情况
  const isWorkflowEditor = location.pathname.startsWith('/workflows/') && location.pathname !== '/workflows'
  const title = isWorkflowEditor ? '工作流编辑器' : (routeTitles[location.pathname] || 'NexusFlow')

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
        <button className="relative p-2 rounded-lg hover:bg-surface-2 transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>
      </div>
    </header>
  )
}
