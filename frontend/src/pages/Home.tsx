import { useEffect, useMemo, useState } from 'react'
import { Play, CheckCircle, Zap, Bot, ArrowRight, Sparkles, Activity, Cpu, Trash2, RotateCcw, Users, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { useAgentStore } from '../stores/agentStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { toast } from '../components/ui/Toast'
import { formatNumber } from '../lib/utils'
import { TaskDetailModal } from '../components/task/TaskDetailModal'

export default function Home() {
  const { tasks, loadTasks, createTask, executeTask, deleteTask } = useTaskStore()
  const { workflows, loadWorkflows } = useWorkflowStore()
  const agentStore = useAgentStore()
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskInput, setNewTaskInput] = useState('')
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [showAllTasks, setShowAllTasks] = useState(false)

  useEffect(() => {
    loadTasks()
    loadWorkflows()
  }, [])

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed')
    const today = new Date().toISOString().slice(0, 10)
    const todayTasks = tasks.filter(t => t.created_at.startsWith(today))
    const todayTokens = todayTasks.reduce((sum, t) => {
      return sum + (t.output ? Math.round(t.output.length / 4) : 0)
    }, 0)
    const totalTokens = tasks.reduce((sum, t) => {
      return sum + (t.output ? Math.round(t.output.length / 4) : 0)
    }, 0)

    return {
      total_executions: tasks.length,
      successful_executions: completed.length,
      success_rate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      today_tokens: todayTokens,
      total_tokens: totalTokens,
    }
  }, [tasks])

  const handleCreateTask = async () => {
    if (!newTaskInput.trim()) return
    setIsCreatingTask(true)
    try {
      if (agentMode) {
        await agentStore.orchestrate(newTaskInput)
        toast('success', 'Agent 团队协作完成！')
      } else {
        const task = await createTask(newTaskInput)
        await executeTask(task.id)
        toast('success', '任务执行完成！')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '任务执行失败'
      toast('error', msg)
    } finally {
      setNewTaskInput('')
      setIsCreatingTask(false)
      loadTasks()
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    deleteTask(taskId)
    toast('success', '任务已删除')
  }

  const handleRetryTask = async (task: typeof tasks[0]) => {
    setIsCreatingTask(true)
    try {
      const newTask = await createTask(task.input_text)
      await executeTask(newTask.id)
      toast('success', '任务重新执行完成！')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '重试失败'
      toast('error', msg)
    } finally {
      setIsCreatingTask(false)
      loadTasks()
    }
  }

  const runningTasks = tasks.filter(t => t.status === 'running')
  const displayTasks = showAllTasks ? tasks : tasks.slice(0, 5)

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
          trend={stats.total_executions > 0 ? `${stats.total_executions} 次` : undefined}
        />
        <StatCard
          icon={CheckCircle}
          label="成功执行"
          value={formatNumber(stats.successful_executions)}
          color="success"
          trend={stats.total_executions > 0 ? `${stats.success_rate}%` : undefined}
        />
        <StatCard
          icon={Activity}
          label="今日 Token"
          value={formatNumber(stats.today_tokens)}
          color="accent"
          trend="今日"
        />
        <StatCard
          icon={Bot}
          label="活跃 Agent"
          value={agentStore.isRunning ? String(agentStore.agents.filter(a => a.status === 'working').length) : '5'}
          color="warning"
          trend={agentStore.isRunning ? '运行中' : '在线'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Input */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">创建新任务</h2>
              <button
                onClick={() => setAgentMode(!agentMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  agentMode
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-surface-2 text-text-secondary border border-border hover:border-primary/30'
                }`}
              >
                <Users className="w-4 h-4" />
                Agent 模式
              </button>
            </div>

            {agentMode && (
              <div className="mb-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
                Agent 模式已开启 — 消息将由 AI 团队协作处理（5 个 Agent 流水线）
              </div>
            )}

            <div className="relative">
              <textarea
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder={agentMode
                  ? "输入复杂任务，Agent 团队将协作完成..."
                  : "输入你的需求，例如：帮我写一个用户登录注册功能，用 Python Flask..."
                }
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newTaskInput.trim()) {
                    handleCreateTask()
                  }
                }}
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
                  ) : agentMode ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isCreatingTask ? (agentMode ? '协作中...' : '执行中...') : agentMode ? 'Agent 协作' : '执行'}
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
            {agentStore.isRunning && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm text-primary font-medium">Agent 团队协作中</span>
                </div>
                <p className="text-xs text-text-muted">
                  {agentStore.agents.filter(a => a.status === 'completed').length}/5 Agent 已完成
                </p>
              </div>
            )}
            {runningTasks.length === 0 && !agentStore.isRunning && (
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
            {agentStore.isRunning && (
              <span className="px-2.5 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                运行中
              </span>
            )}
            {!agentStore.isRunning && (
              <span className="px-2.5 py-1 bg-surface-2 text-text-muted text-xs font-medium rounded-full">
                待命
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {agentStore.agents.map((agent, index) => {
            const statusConfig: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
              completed: { bg: 'bg-success/5', border: 'border-success/20', icon: 'text-success', dot: 'bg-success' },
              working: { bg: 'bg-primary/5', border: 'border-primary/30', icon: 'text-primary', dot: 'bg-primary animate-pulse' },
              thinking: { bg: 'bg-warning/5', border: 'border-warning/20', icon: 'text-warning', dot: 'bg-warning animate-pulse' },
              error: { bg: 'bg-danger/5', border: 'border-danger/20', icon: 'text-danger', dot: 'bg-danger' },
              idle: { bg: 'bg-surface-2', border: 'border-border', icon: 'text-text-muted', dot: 'bg-text-muted' },
            }
            const cfg = statusConfig[agent.status] || statusConfig.idle

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
                {agent.error && (
                  <div className="text-xs text-danger bg-danger/5 rounded-md p-2 line-clamp-2 border border-danger/20">
                    {agent.error}
                  </div>
                )}
                {index < agentStore.agents.length - 1 && (
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
          {displayTasks.map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-surface-2/50 rounded-lg hover:bg-surface-2 transition-colors group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusBadge status={task.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary group-hover:text-primary transition-colors truncate">{task.input_text}</p>
                  <p className="text-xs text-text-muted">{new Date(task.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {task.status === 'completed' && task.duration_ms != null && (
                  <span className="text-xs text-text-muted font-mono">{(task.duration_ms / 1000).toFixed(1)}s</span>
                )}
                <div className="w-16 h-1 bg-background rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`h-full rounded-full ${task.status === 'completed' ? 'bg-success' : task.status === 'failed' ? 'bg-danger' : 'bg-gradient-to-r from-primary to-accent'}`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedTask(task)}
                    className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all"
                    title="查看详情"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {task.status !== 'running' && (
                    <button
                      onClick={() => handleRetryTask(task)}
                      className="p-1.5 text-text-muted hover:text-warning hover:bg-warning/10 rounded transition-all"
                      title="重新执行"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-all"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length > 5 && (
            <button
              onClick={() => setShowAllTasks(!showAllTasks)}
              className="w-full py-2 text-sm text-text-muted hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              {showAllTasks ? (
                <>收起 <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>查看全部 {tasks.length} 个任务 <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-text-muted opacity-50" />
              </div>
              <p className="text-text-secondary font-medium mb-1">还没有任务</p>
              <p className="text-text-muted text-sm">在上方输入需求，开始你的第一个 AI 任务</p>
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
        <div className="w-8 h-8 rounded-lg bg-surface-2/80 flex items-center justify-center">
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
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color} flex items-center gap-1.5 w-fit shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
