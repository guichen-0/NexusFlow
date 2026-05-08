import { useEffect, useState } from 'react'
import { Play, Clock, CheckCircle, Zap, TrendingUp, Bot } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { mockAnalytics, mockAgentProcess } from '../services/mock'
import { formatNumber } from '../lib/utils'

export default function Home() {
  const { tasks, loadTasks } = useTaskStore()
  const { workflows, loadWorkflows } = useWorkflowStore()
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskInput, setNewTaskInput] = useState('')

  useEffect(() => {
    loadTasks()
    loadWorkflows()
  }, [])

  const stats = mockAnalytics

  const handleCreateTask = () => {
    if (!newTaskInput.trim()) return
    setIsCreatingTask(true)
    // 模拟创建任务
    setTimeout(() => {
      setNewTaskInput('')
      setIsCreatingTask(false)
    }, 500)
  }

  const runningTasks = tasks.filter(t => t.status === 'running')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="space-y-6 animate-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="总执行次数"
          value={formatNumber(stats.total_executions)}
          color="primary"
        />
        <StatCard
          icon={CheckCircle}
          label="成功执行"
          value={formatNumber(stats.successful_executions)}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="成功率"
          value={`${stats.success_rate}%`}
          color="accent"
        />
        <StatCard
          icon={Bot}
          label="活跃 Agent"
          value="5"
          color="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Input */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              创建新任务
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="输入你的需求，例如：帮我写一个用户登录注册功能，用 Python Flask"
                className="flex-1 px-4 py-3 bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask || !newTaskInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-primary to-accent rounded-lg font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                执行
              </button>
            </div>

            {/* Quick Templates */}
            <div className="mt-4">
              <p className="text-sm text-text-muted mb-2">快捷模板：</p>
              <div className="flex flex-wrap gap-2">
                {workflows.slice(0, 4).map(wf => (
                  <button
                    key={wf.id}
                    onClick={() => setNewTaskInput(wf.description)}
                    className="px-3 py-1.5 bg-surface-2 border border-border rounded-full text-sm text-text-secondary hover:border-primary hover:text-primary transition-colors"
                  >
                    {wf.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Running Tasks */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">运行中</h2>
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              {runningTasks.length}
            </span>
          </div>

          <div className="space-y-3">
            {runningTasks.map(task => (
              <div key={task.id} className="p-3 bg-surface-2 rounded-lg">
                <p className="text-sm text-text-primary truncate">
                  {task.input_text}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{task.progress}%</span>
                </div>
              </div>
            ))}
            {runningTasks.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">
                暂无运行中的任务
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agent Collaboration Panel */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Agent 协作状态</h2>
          <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            实时
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {mockAgentProcess.map((agent, index) => (
            <div key={agent.id} className="relative">
              <div className={`p-4 rounded-lg border transition-all ${
                agent.status === 'completed'
                  ? 'bg-success/5 border-success/20'
                  : agent.status === 'working'
                  ? 'bg-primary/5 border-primary/20 animate-pulse-glow'
                  : agent.status === 'thinking'
                  ? 'bg-warning/5 border-warning/20'
                  : 'bg-surface-2 border-border'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className={`w-4 h-4 ${
                    agent.status === 'completed' ? 'text-success' :
                    agent.status === 'working' ? 'text-primary' :
                    agent.status === 'thinking' ? 'text-warning' : 'text-text-muted'
                  }`} />
                  <span className="text-sm font-medium text-text-primary">
                    {agent.name}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{agent.role}</p>
                {agent.current_thought && (
                  <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                    {agent.current_thought}
                  </p>
                )}
              </div>
              {index < mockAgentProcess.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">最近任务</h2>
        <div className="space-y-3">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <div className="flex items-center gap-3">
                <StatusBadge status={task.status} />
                <div>
                  <p className="text-sm text-text-primary">{task.input_text}</p>
                  <p className="text-xs text-text-muted">{task.created_at}</p>
                </div>
              </div>
              <button className="px-3 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors">
                查看详情
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any
  label: string
  value: string
  color: 'primary' | 'success' | 'accent' | 'warning'
}) {
  const colors = {
    primary: 'from-primary/20 to-primary/5 border-primary/20',
    success: 'from-success/20 to-success/5 border-success/20',
    accent: 'from-accent/20 to-accent/5 border-accent/20',
    warning: 'from-warning/20 to-warning/5 border-warning/20'
  }
  const iconColors = {
    primary: 'text-primary',
    success: 'text-success',
    accent: 'text-accent',
    warning: 'text-warning'
  }

  return (
    <div className={`glass rounded-xl p-5 bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    completed: { color: 'success', label: '已完成' },
    running: { color: 'primary', label: '运行中' },
    pending: { color: 'warning', label: '等待中' },
    failed: { color: 'danger', label: '失败' }
  }
  const { color, label } = config[status as keyof typeof config] || config.pending

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${color}/10 text-${color}`}>
      {label}
    </span>
  )
}
