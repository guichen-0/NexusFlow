import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Workflow,
  ListTodo,
  BarChart3,
  Settings,
  Sparkles
} from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '工作台' },
  { to: '/workflows', icon: Workflow, label: '工作流' },
  { to: '/tasks', icon: ListTodo, label: '任务' },
  { to: '/analytics', icon: BarChart3, label: '数据分析' },
  { to: '/settings', icon: Settings, label: '设置' }
]

export function Sidebar() {
  const { useMockMode } = useSettingsStore()

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">NexusFlow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary border-l-2 border-transparent'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Status */}
      <div className="p-4 border-t border-border">
        <div className="glass rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${useMockMode ? 'bg-warning' : 'bg-success'}`} />
            <span className="text-text-secondary">
              {useMockMode ? 'Mock 模式' : '生产模式'}
            </span>
          </div>
          {useMockMode && (
            <p className="text-xs text-text-muted mt-1">
              AI 调用使用模拟数据
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
