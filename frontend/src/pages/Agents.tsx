import { useEffect } from 'react'
import { Bot, Clock, Cpu, Zap, CheckCircle2, Activity, BrainCircuit } from 'lucide-react'
import { mockAgentProcess } from '../services/mock'
import { formatNumber } from '../lib/utils'

const agentIcons = [BrainCircuit, Cpu, Activity, Zap, CheckCircle2]
const agentModels = ['GPT-4o', 'GPT-4o', 'GPT-4o-mini', 'GPT-3.5-turbo', 'GPT-3.5-turbo']
const agentTokens = [2450, 8900, 0, 0, 0]

export default function Agents() {
  const agents = mockAgentProcess

  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.status === 'working' || a.status === 'thinking').length
  const completedAgents = agents.filter(a => a.status === 'completed').length
  const totalTokens = agents.reduce((sum, _, i) => sum + agentTokens[i], 0)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Agent 团队</h1>
          <p className="text-text-secondary mt-1">
            查看 AI Agent 的实时状态和思维过程
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-accent/10 text-accent text-sm font-medium rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            {activeAgents} 活跃中
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Agent 总数" value={totalAgents.toString()} color="#6366f1" />
        <StatCard icon={Activity} label="活跃 Agent" value={activeAgents.toString()} color="#10b981" />
        <StatCard icon={CheckCircle2} label="已完成" value={completedAgents.toString()} color="#8b5cf6" />
        <StatCard icon={Zap} label="Token 消耗" value={formatNumber(totalTokens)} color="#f59e0b" subtext="Token" />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent, index) => {
          const Icon = agentIcons[index] || Bot
          const statusConfig = getStatusConfig(agent.status)
          return (
            <div
              key={agent.id}
              className={`glass rounded-xl p-5 transition-all duration-300 animate-in ${
                statusConfig.glowClass
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${statusConfig.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: statusConfig.color }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{agent.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{agent.role}</p>
                  </div>
                </div>
                <StatusPill status={agent.status} />
              </div>

              {/* Thought Bubble */}
              {agent.current_thought && (
                <div className="relative mb-4 pl-3 border-l-2" style={{ borderColor: `${statusConfig.color}40` }}>
                  <p className="text-sm text-text-secondary leading-relaxed italic">
                    "{agent.current_thought}"
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <BrainCircuit className="w-3 h-3" style={{ color: statusConfig.color }} />
                    <span className="text-xs font-medium" style={{ color: statusConfig.color }}>
                      思维中
                    </span>
                  </div>
                </div>
              )}

              {!agent.current_thought && (
                <div className="mb-4 p-3 bg-surface-2 rounded-lg border border-border/50">
                  <p className="text-sm text-text-muted text-center">等待调度...</p>
                </div>
              )}

              {/* Meta Info */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">{agentModels[index]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-mono text-text-secondary">
                    {agentTokens[index]} tok
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">{getDuration(agent.status)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Collaboration Flow */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-5">协作流程</h2>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {agents.map((agent, index) => (
            <div key={agent.id} className="flex items-center flex-shrink-0">
              <div className={`
                w-12 h-12 rounded-xl flex flex-col items-center justify-center
                transition-all duration-300
                ${getStatusConfig(agent.status).ringClass}
              `}>
                {(agentIcons[index] || Bot)({
                  className: `w-5 h-5 ${getStatusConfig(agent.status).iconClass}`,
                  style: { color: getStatusConfig(agent.status).color }
                })}
                <span
                  className="text-[9px] font-medium mt-0.5"
                  style={{ color: getStatusConfig(agent.status).color }}
                >
                  {getStatusLabelShort(agent.status)}
                </span>
              </div>
              {index < agents.length - 1 && (
                <div className="flex items-center mx-1">
                  <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                    <path d="M0 8 H24 M20 4 L26 8 L20 12" stroke="#3a3a5e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, subtext }: {
  icon: any; label: string; value: string; color: string; subtext?: string
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
          {subtext && <p className="text-xs text-text-muted mt-0.5">{subtext}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const config = getStatusConfig(status)
  return (
    <span
      className="px-2 py-1 text-[11px] font-medium rounded-full"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'working':
      return {
        color: '#6366f1',
        label: '工作中',
        glowClass: 'border-primary/30 hover:border-primary/50',
        ringClass: 'bg-primary/10 border border-primary/30',
        iconClass: 'animate-pulse',
      }
    case 'thinking':
      return {
        color: '#f59e0b',
        label: '思考中',
        glowClass: 'border-warning/30 hover:border-warning/50',
        ringClass: 'bg-warning/10 border border-warning/30',
        iconClass: 'animate-pulse',
      }
    case 'completed':
      return {
        color: '#10b981',
        label: '已完成',
        glowClass: 'border-success/30 hover:border-success/50',
        ringClass: 'bg-success/10 border border-success/30',
        iconClass: '',
      }
    default:
      return {
        color: '#64748b',
        label: '待命中',
        glowClass: '',
        ringClass: 'bg-surface-2 border border-border',
        iconClass: '',
      }
  }
}

function getStatusLabelShort(status: string): string {
  const map: Record<string, string> = {
    working: '运行',
    thinking: '思考',
    completed: '完成',
    idle: '等待',
  }
  return map[status] || status
}

function getDuration(status: string): string {
  switch (status) {
    case 'working': return '3m 12s'
    case 'thinking': return '0m 45s'
    case 'completed': return '2m 08s'
    default: return '--:--'
  }
}
