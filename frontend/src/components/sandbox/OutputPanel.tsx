import { useRef, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, Trash2, Terminal } from 'lucide-react'
import type { ExecutionRecord } from '../../types/sandbox'

interface OutputPanelProps {
  result: ExecutionRecord | null
  history: ExecutionRecord[]
  isRunning?: boolean
  onSelectHistory?: (record: ExecutionRecord) => void
  onClearHistory?: () => void
}

function StatusBadge({ record }: { record: ExecutionRecord }) {
  if (record.timed_out) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning font-medium border border-warning/20"><AlertTriangle className="w-3 h-3" />超时</span>
  }
  if (record.success) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success font-medium border border-success/20"><CheckCircle className="w-3 h-3" />成功</span>
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-danger/10 text-danger font-medium border border-danger/20"><XCircle className="w-3 h-3" />失败 (exit {record.exit_code})</span>
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function OutputBlock({ label, content, variant }: { label: string; content: string; variant?: 'error' }) {
  if (!content) return null
  return (
    <div className="mb-3">
      <span className="text-[11px] font-medium text-text-muted mb-1 block">{label}</span>
      <pre className={`p-3 rounded-xl text-xs font-mono whitespace-pre-wrap break-all overflow-auto max-h-64 shadow-inner ${
        variant === 'error'
          ? 'bg-danger/5 border border-danger/15 text-danger'
          : 'bg-surface-2/50 border border-border/30 text-text-primary'
      }`}>{content}</pre>
    </div>
  )
}

export default function OutputPanel({ result, history, isRunning, onSelectHistory, onClearHistory }: OutputPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [result])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
        {isRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-b-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <span className="text-sm text-text-muted animate-pulse">执行中...</span>
          </div>
        ) : result ? (
          <div className="animate-in">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge record={result} />
              <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(result.duration_ms)}</span>
              <span className="text-xs text-text-muted px-1.5 py-0.5 rounded-md bg-surface-2/50 border border-border/30">{result.language}</span>
            </div>
            <OutputBlock label="输出 (stdout)" content={result.stdout} />
            <OutputBlock label="错误 (stderr)" content={result.stderr} variant="error" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-2/50 flex items-center justify-center animate-float">
              <Terminal className="w-6 h-6 text-text-muted/40" />
            </div>
            <span className="text-xs">运行代码后查看输出</span>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-t border-border/40">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">历史记录</span>
            {onClearHistory && (
              <button onClick={onClearHistory} className="text-text-muted hover:text-danger p-1 rounded-md hover:bg-danger/10 transition-all duration-200" title="清空历史">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {history.slice(0, 20).map((record) => (
              <button
                key={record.id}
                onClick={() => onSelectHistory?.(record)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-surface-2/50 transition-all duration-150 text-left group"
              >
                {record.success ? <CheckCircle className="w-3 h-3 text-success shrink-0" /> : record.timed_out ? <AlertTriangle className="w-3 h-3 text-warning shrink-0" /> : <XCircle className="w-3 h-3 text-danger shrink-0" />}
                <span className="text-xs text-text-secondary truncate flex-1 font-mono">{record.code.slice(0, 60)}</span>
                <span className="text-[10px] text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">{formatDuration(record.duration_ms)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
