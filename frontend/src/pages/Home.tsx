import { useEffect, useState } from 'react'
import { Play, Clock, CheckCircle, Zap, TrendingUp, Bot, ArrowRight, Sparkles, Activity, Cpu, DollarSign } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { toast } from '../components/ui/Toast'
import { mockAnalytics, mockAgentProcess, mockTokenUsage } from '../services/mock'
import { formatNumber } from '../lib/utils'
import { TaskDetailModal } from '../components/task/TaskDetailModal'

export default function Home() {
  const { tasks, loadTasks, createTask, executeTask } = useTaskStore()
  const { workflows, loadWorkflows } = useWorkflowStore()
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskInput, setNewTaskInput] = useState('')
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadTasks()
    loadWorkflows()
  }, [])

  const stats = mockAnalytics
  const todayTokens = mockTokenUsage[mockTokenUsage.length - 1]?.tokens || 0

  const handleCreateTask = async () => {
    if (!newTaskInput.trim()) return
    setIsCreatingTask(true)
    try {
      const task = await createTask(newTaskInput)
      await executeTask(task.id)
      toast('success', '任务执行完成！')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '任务执行失败'
      toast('error', msg)
    } finally {
      setNewTaskInput('')
      setIsCreatingTask(false)
      loadTasks()
    }
  }

  const openDetail = (task: typeof tasks[0]) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const runningTasks = tasks.filter(t => t.status === 'running')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden glass rounded-xl p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm text-primary font-medium">AI 多模型协作引擎</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            欢迎回来，开始你的下一个 AI 任务
          </h1>
          <p className="text-text-secondary">
            输入需求描述，NexusFlow 将自动拆解任务并调度多个 AI Agent 协作完成。
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="总执行次数"
          value={formatNumber(stats.total_executions)}
          color="primary"
          trend="+12%"
        />
        <StatCard
          icon={CheckCircle}
          label="成功执行"
          value={formatNumber(stats.successful_executions)}
          color="success"
          trend={`${stats.success_rate}%`}
        />
        <StatCard
          icon={Activity}
          label="今日 Token"
          value={formatNumber(todayTokens)}
          color="accent"
          trend="今日"
        />
        <StatCard
          icon={Bot}
          label="活跃 Agent"
          value="5"
          color="warning"
          trend="在线"
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

            <div className="relative">
              <textarea
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="输入你的需求，例如：帮我写一个用户登录注册功能，用 Python Flask..."
                rows={3}
                className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-xs text-text-muted">{newTaskInput.length}</span>
                <button
                  onClick={handleCreateTask}
                  disabled={isCreatingTask || !newTaskInput.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-primary to-accent rounded-lg font-medium text-white hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2 text-sm"
                >
                  {isCreatingTask ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isCreatingTask ? '创建中...' : '执行'}
                </button>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-sm text-text-muted mb-3">快捷模板</p>
              <div className="flex flex-wrap gap-2">
                {workflows.slice(0, 5).map(wf => (
                  <button
                    key={wf.id}
                    onClick={() => setNewTaskInput(wf.description)}
                    className="group px-3 py-1.5 bg-surface-2 border border-border rounded-full text-sm text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5"
                  >
                    {wf.name}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
              <div key={task.id} className="p-3 bg-surface-2 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                <p className="text-sm text-text-primary truncate mb-2">
                  {task.input_text}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted font-mono">{task.progress}%</span>
                </div>
              </div>
            ))}
            {runningTasks.length === 0 && (
              <div className="text-center py-8">
                <Cpu className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-text-muted">暂无运行中的任务</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Collaboration Panel */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Agent 协作状态</h2>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              实时
            </span>
            <span className="text-xs text-text-muted">
              {mockAgentProcess.filter(a => a.status === 'working' || a.status === 'thinking').length} 活跃
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {mockAgentProcess.map((agent, index) => {
            const statusConfig = {
              completed: { bg: 'bg-success/5', border: 'border-success/20', icon: 'text-success', dot: 'bg-success' },
              working: { bg: 'bg-primary/5', border: 'border-primary/30', icon: 'text-primary', dot: 'bg-primary animate-pulse' },
              thinking: { bg: 'bg-warning/5', border: 'border-warning/20', icon: 'text-warning', dot: 'bg-warning animate-pulse' },
              idle: { bg: 'bg-surface-2', border: 'border-border', icon: 'text-text-muted', dot: 'bg-text-muted' },
            }
            const cfg = statusConfig[agent.status]

            return (
              <div key={agent.id} className={`relative p-4 rounded-lg border transition-all ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <Bot className={`w-4 h-4 ${cfg.icon}`} />
                  <span className="text-sm font-medium text-text-primary truncate">
                    {agent.name}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-2">{agent.role}</p>
                {agent.current_thought && (
                  <div className="text-xs text-text-secondary bg-background/50 rounded-md p-2 line-clamp-2 border border-border/30">
                    {agent.current_thought}
                  </div>
                )}
                {index < mockAgentProcess.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">最近任务</h2>
          <span className="text-xs text-text-muted">{tasks.length} 个任务</span>
        </div>
        <div className="space-y-2">
          {tasks.slice(0, 5).map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg hover:bg-surface-2 transition-colors group">
              <div className="flex items-center gap-3">
                <StatusBadge status={task.status} />
                <div>
                  <p className="text-sm text-text-primary group-hover:text-primary transition-colors">{task.input_text}</p>
                  <p className="text-xs text-text-muted">{new Date(task.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-1 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${task.status === 'completed' ? 'bg-success' : 'bg-gradient-to-r from-primary to-accent'}`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <button
                  onClick={() => openDetail(task)}
                  className="px-2.5 py-1 text-xs text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all"
                >
                  详情
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-text-muted">暂无任务记录</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, trend }: {
  icon: any
  label: string
  value: string
  color: 'primary' | 'success' | 'accent' | 'warning'
  trend?: string
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
    <div className={`glass rounded-xl p-4 bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-muted">{label}</p>
        {trend && (
          <span className="text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-text-primary">{value}</p>
        <div className={`w-8 h-8 rounded-lg bg-surface-2/80 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; dot: string }> = {
    completed: { color: 'bg-success/10 text-success', label: '已完成', dot: 'bg-success' },
    running: { color: 'bg-primary/10 text-primary', label: '运行中', dot: 'bg-primary animate-pulse' },
    pending: { color: 'bg-warning/10 text-warning', label: '等待中', dot: 'bg-warning' },
    failed: { color: 'bg-danger/10 text-danger', label: '失败', dot: 'bg-danger' }
  }
  const { color, label, dot } = config[status] || config.pending

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color} flex items-center gap-1.5 w-fit`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
