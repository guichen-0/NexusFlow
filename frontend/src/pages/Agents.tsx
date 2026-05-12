import { useState, useRef, useEffect } from 'react'
import {
  Bot, Clock, Cpu, Zap, CheckCircle2, AlertCircle,
  BrainCircuit, Send, RotateCcw, ChevronDown, ChevronRight,
  Activity, Loader2, X
} from 'lucide-react'
import { useAgentStore } from '../stores/agentStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { Agent } from '../types/agent'

const agentIcons: Record<string, any> = {
  analyze: BrainCircuit,
  generate: Cpu,
  review: Activity,
  fix: Zap,
  report: CheckCircle2,
}

export default function Agents() {
  const {
    agents, isRunning, currentAgentId, pipelineResults,
    totalTokens, taskInput, setTaskInput,
    orchestrate, resetAgents, cancelOrchestrate,
  } = useAgentStore()

  const { apiKey } = useSettingsStore()
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeCount = agents.filter(a => a.status === 'working' || a.status === 'thinking').length
  const completedCount = agents.filter(a => a.status === 'completed').length
  const errorCount = agents.filter(a => a.status === 'error').length
  const totalTok = totalTokens
    ? totalTokens.prompt + totalTokens.completion
    : agents.reduce((sum, a) => sum + (a.tokens?.total_tokens || 0), 0)

  const handleSubmit = () => {
    const trimmed = taskInput.trim()
    if (!trimmed || isRunning) return
    orchestrate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 自动滚动到当前 Agent
  const currentAgentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (currentAgentRef.current) {
      currentAgentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentAgentId])

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Agent 团队</h1>
          <p className="text-text-secondary mt-1">
            多 Agent 协作流水线 — 提交任务，AI 团队自动协作完成
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="px-3 py-1.5 bg-accent/10 text-accent text-sm font-medium rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              {activeCount} 活跃中
            </span>
          )}
          {!isRunning && completedCount > 0 && (
            <span className="px-3 py-1.5 bg-success/10 text-success text-sm font-medium rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已完成
            </span>
          )}
        </div>
      </div>

      {/* Task Input */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4.5 h-4.5 text-primary" />
          <span className="text-sm font-semibold text-text-primary">任务输入</span>
        </div>
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={taskInput}
            onChange={e => setTaskInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你想要完成的任务，例如：用 React + TypeScript 开发一个待办事项应用&#10;Shift+Enter 换行"
            rows={3}
            disabled={isRunning}
            className="flex-1 px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            {isRunning ? (
              <button
                onClick={cancelOrchestrate}
                className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
                title="取消执行"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!taskInput.trim() || !apiKey}
                className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                title="开始执行"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {completedCount > 0 && !isRunning && (
              <button
                onClick={resetAgents}
                className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:border-border-secondary transition-colors"
                title="重置"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {!apiKey && (
          <p className="text-xs text-warning mt-2">请先在设置中配置 API Key</p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Agent 总数" value={agents.length.toString()} color="#6366f1" />
        <StatCard icon={Activity} label="活跃 Agent" value={activeCount.toString()} color="#10b981" />
        <StatCard icon={CheckCircle2} label="已完成" value={completedCount.toString()} color="#8b5cf6" />
        <StatCard
          icon={Zap}
          label="Token 消耗"
          value={totalTok > 0 ? formatNumber(totalTok) : '0'}
          color="#f59e0b"
          subtext="Token"
        />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => {
          const Icon = agentIcons[agent.id] || Bot
          const statusConfig = getStatusConfig(agent.status)
          const isCurrentAgent = agent.id === currentAgentId
          return (
            <div
              key={agent.id}
              ref={isCurrentAgent ? currentAgentRef : undefined}
              className={`glass rounded-xl p-5 transition-all duration-300 animate-in border ${
                isCurrentAgent ? 'border-primary/50 shadow-lg shadow-primary/5' : ''
              } ${statusConfig.glowClass}`}
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

              {/* Content Area */}
              {agent.status === 'working' && (
                <div className="relative mb-4 pl-3 border-l-2 border-primary/40">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-sm text-primary font-medium">执行中...</span>
                  </div>
                </div>
              )}

              {agent.status === 'error' && (
                <div className="mb-4 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs">{agent.error || '执行失败'}</span>
                  </div>
                </div>
              )}

              {agent.status === 'idle' && !isRunning && (
                <div className="mb-4 p-3 bg-surface-2 rounded-lg border border-border/50">
                  <p className="text-sm text-text-muted text-center">等待调度...</p>
                </div>
              )}

              {agent.status === 'completed' && agent.output && (
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedOutput(expandedOutput === agent.id ? null : agent.id)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-2"
                  >
                    {expandedOutput === agent.id ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    查看输出 ({(agent.output.length / 1024).toFixed(1)}KB)
                  </button>
                  {expandedOutput === agent.id && (
                    <div className="p-3 bg-surface-2 rounded-lg border border-border/50 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                        {agent.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Meta Info */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">
                    {agent.tokens?.total_tokens
                      ? `${agent.tokens.total_tokens} tok`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">
                    {agent.status === 'completed' ? '完成' :
                     agent.status === 'working' ? '运行中' :
                     agent.status === 'error' ? '失败' : '—'}
                  </span>
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
          {agents.map((agent, index) => {
            const Icon = agentIcons[agent.id] || Bot
            const statusConf = getStatusConfig(agent.status)
            return (
              <div key={agent.id} className="flex items-center flex-shrink-0">
                <div className={`
                  w-14 h-14 rounded-xl flex flex-col items-center justify-center
                  transition-all duration-300
                  ${statusConf.ringClass}
                `}>
                  {agent.status === 'working' ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: statusConf.color }} />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: statusConf.color }} />
                  )}
                  <span
                    className="text-[9px] font-medium mt-0.5"
                    style={{ color: statusConf.color }}
                  >
                    {getStatusLabelShort(agent.status)}
                  </span>
                </div>
                {index < agents.length - 1 && (
                  <div className="flex items-center mx-1">
                    <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
                      <path
                        d="M0 8 H24 M20 4 L26 8 L20 12"
                        stroke={agent.status === 'completed' ? 'var(--color-success)' : 'var(--color-border-2)'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pipeline Results Summary */}
      {pipelineResults && Object.keys(pipelineResults).length > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">执行结果</h2>
          <div className="space-y-3">
            {Object.entries(pipelineResults).map(([id, result]) => (
              <div key={id} className="p-3 bg-surface-2 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{result.name}</span>
                  <StatusPill status={result.status} />
                </div>
                {result.output && (
                  <p className="text-xs text-text-secondary line-clamp-3">{result.output}</p>
                )}
                {result.error && (
                  <p className="text-xs text-danger">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ========== 子组件 ==========

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
          style={{ backgroundColor: color, opacity: 0.15 }}
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
        color: 'var(--color-primary)',
        label: '工作中',
        glowClass: 'border-primary/30 hover:border-primary/50',
        ringClass: 'bg-primary/10 border border-primary/30',
      }
    case 'thinking':
      return {
        color: 'var(--color-warning)',
        label: '思考中',
        glowClass: 'border-warning/30 hover:border-warning/50',
        ringClass: 'bg-warning/10 border border-warning/30',
      }
    case 'completed':
      return {
        color: 'var(--color-success)',
        label: '已完成',
        glowClass: 'border-success/30 hover:border-success/50',
        ringClass: 'bg-success/10 border border-success/30',
      }
    case 'error':
      return {
        color: 'var(--color-danger)',
        label: '失败',
        glowClass: 'border-danger/30 hover:border-danger/50',
        ringClass: 'bg-danger/10 border border-danger/30',
      }
    default:
      return {
        color: 'var(--color-text-muted)',
        label: '待命中',
        glowClass: '',
        ringClass: 'bg-surface-2 border border-border',
      }
  }
}

function getStatusLabelShort(status: string): string {
  const map: Record<string, string> = {
    working: '运行',
    thinking: '思考',
    completed: '完成',
    error: '失败',
    idle: '等待',
  }
  return map[status] || status
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}
