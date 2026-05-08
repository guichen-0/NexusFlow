import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Zap, Clock, TrendingUp, CheckCircle, Bot, Activity } from 'lucide-react'
import { mockAnalytics, mockTokenUsage, mockExecutionHistory } from '../services/mock'
import { formatNumber } from '../lib/utils'

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'execution'>('overview')
  const stats = mockAnalytics

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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="总 Token 消耗"
          value={formatNumber(stats.total_tokens)}
          subtext="Token"
          color="#6366f1"
        />
        <StatCard
          icon={CheckCircle}
          label="成功率"
          value={`${stats.success_rate}%`}
          subtext="任务成功"
          color="#10b981"
        />
        <StatCard
          icon={Clock}
          label="平均执行时间"
          value={`${stats.avg_execution_time}s`}
          subtext="单次任务"
          color="#8b5cf6"
        />
        <StatCard
          icon={Bot}
          label="活跃 Agent"
          value={stats.active_workflows.toString()}
          subtext="工作流"
          color="#f59e0b"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'overview', label: '总览' },
          { id: 'tokens', label: 'Token 消耗' },
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
                <BarChart data={mockTokenUsage}>
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
                <LineChart data={mockTokenUsage}>
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
          <h3 className="text-lg font-semibold text-text-primary mb-4">Token 消耗详情</h3>
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
                {mockTokenUsage.map(row => (
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
            {mockExecutionHistory.map(exec => (
              <div key={exec.id} className="flex items-center justify-between p-4 bg-surface-2 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    exec.status === 'completed' ? 'bg-success' : 'bg-primary animate-pulse'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{exec.workflow_name}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(exec.started_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">{exec.duration}s</p>
                    <p className="text-xs text-text-muted">执行时间</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">{formatNumber(exec.tokens_used)}</p>
                    <p className="text-xs text-text-muted">Token</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    exec.status === 'completed'
                      ? 'bg-success/10 text-success'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {exec.status === 'completed' ? '已完成' : '运行中'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
