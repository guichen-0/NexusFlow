import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Zap, Clock, TrendingUp, CheckCircle, Bot, Activity } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { formatNumber } from '../lib/utils'

interface TokenUsageEntry {
  date: string
  tokens: number
  requests: number
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'execution'>('overview')
  const tasks = useTaskStore(s => s.tasks)
  const loadTasks = useTaskStore(s => s.loadTasks)

  useEffect(() => { loadTasks() }, [])

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed')
    const failed = tasks.filter(t => t.status === 'failed')
    const totalDurations = completed
      .map(t => t.duration_ms ?? 0)
      .filter(d => d > 0)
    const avgMs = totalDurations.length > 0
      ? totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length
      : 0

    return {
      total_executions: tasks.length,
      successful_executions: completed.length,
      success_rate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      avg_execution_time: +(avgMs / 1000).toFixed(1),
    }
  }, [tasks])

  const tokenUsage = useMemo(() => {
    const byDate = new Map<string, { tokens: number; requests: number }>()
    for (const t of tasks) {
      const date = t.created_at.slice(0, 10)
      const entry = byDate.get(date) ?? { tokens: 0, requests: 0 }
      entry.requests++
      // 估算 token：output 长度 / 4 作为粗略估计
      const estTokens = t.output ? Math.round(t.output.length / 4) : 0
      entry.tokens += estTokens
      byDate.set(date, entry)
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))
  }, [tasks])

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">数据分析</h1>
          <p className="text-text-secondary mt-1">
            查看 AI 使用统计和性能指标
          </p>
        </div>
      </div>

      {stats.total_executions === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">暂无数据</p>
          <p className="text-text-muted text-sm mt-1">执行任务后，这里会显示使用统计</p>
        </div>
      )}

      {stats.total_executions > 0 && (<>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Zap}
            label="总执行次数"
            value={stats.total_executions.toString()}
            subtext="次任务"
            color="#6366f1"
          />
          <StatCard
            icon={CheckCircle}
            label="成功率"
            value={`${stats.success_rate}%`}
            subtext={`${stats.successful_executions}/${stats.total_executions}`}
            color="#10b981"
          />
          <StatCard
            icon={Clock}
            label="平均执行时间"
            value={stats.avg_execution_time > 0 ? `${stats.avg_execution_time}s` : '-'}
            subtext="单次任务"
            color="#8b5cf6"
          />
          <StatCard
            icon={Bot}
            label="失败任务"
            value={(stats.total_executions - stats.successful_executions).toString()}
            subtext="需要关注"
            color="#f59e0b"
          />
        </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'overview', label: '总览' },
          { id: 'tokens', label: '任务量趋势' },
          { id: 'execution', label: '执行历史' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Usage Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Token 消耗趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tokenUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121a',
                      border: '1px solid #2a2a3e',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Request Volume Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">请求量趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tokenUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121a',
                      border: '1px solid #2a2a3e',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">每日任务量</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">日期</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Token 消耗</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">请求次数</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">平均每次</th>
                </tr>
              </thead>
              <tbody>
                {tokenUsage.map(row => (
                  <tr key={row.date} className="border-b border-border/50">
                    <td className="px-4 py-3 text-sm text-text-primary">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-mono">
                      {formatNumber(row.tokens)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-right">{row.requests}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary text-right">
                      ~{Math.round(row.tokens / row.requests)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'execution' && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">执行历史</h3>
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-success' : task.status === 'failed' ? 'bg-danger' : 'bg-primary animate-pulse'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{task.input_text}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(task.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {task.duration_ms != null && (
                    <div className="text-right">
                      <p className="text-sm text-text-secondary">{(task.duration_ms / 1000).toFixed(1)}s</p>
                      <p className="text-xs text-text-muted">执行时间</p>
                    </div>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed'
                      ? 'bg-success/10 text-success'
                      : task.status === 'failed'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-primary/10 text-primary'
                  }`}>
                    {task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : task.status === 'running' ? '运行中' : '等待中'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: any
  label: string
  value: string
  subtext: string
  color: string
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          <p className="text-xs text-text-muted mt-1">{subtext}</p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  )
}
