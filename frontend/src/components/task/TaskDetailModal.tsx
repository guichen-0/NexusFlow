import { X, Play, Trash2, Clock, CheckCircle, AlertCircle, Bot, Zap } from 'lucide-react'
import type { Task } from '../../types/workflow'
import { mockWorkflowTemplates } from '../../services/mock'

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
}

export function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  if (!isOpen || !task) return null

  const workflow = mockWorkflowTemplates.find(w => w.id === task.workflow_id)
  const nodes = workflow?.nodes || []

  const statusConfig = {
    completed: { label: '已完成', color: 'text-success', bg: 'bg-success/10' },
    running: { label: '运行中', color: 'text-primary', bg: 'bg-primary/10' },
    pending: { label: '等待中', color: 'text-warning', bg: 'bg-warning/10' },
    failed: { label: '失败', color: 'text-danger', bg: 'bg-danger/10' },
  }
  const status = statusConfig[task.status] || statusConfig.pending

  const getNodeStatus = (index: number) => {
    const progressPerNode = 100 / Math.max(nodes.length, 1)
    const nodeProgress = task.progress / progressPerNode
    if (index < Math.floor(nodeProgress)) return 'completed'
    if (index < Math.ceil(nodeProgress) && task.status === 'running') return 'running'
    return 'pending'
  }

  const nodeStatusIcons = {
    completed: <CheckCircle className="w-4 h-4 text-success" />,
    running: <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />,
    pending: <Clock className="w-4 h-4 text-text-muted" />,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl border border-border animate-in shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
              {task.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : task.status === 'running' ? (
                <Play className="w-5 h-5 text-primary" />
              ) : task.status === 'failed' ? (
                <AlertCircle className="w-5 h-5 text-danger" />
              ) : (
                <Clock className="w-5 h-5 text-warning" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">任务详情</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-muted">{task.id}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-auto">
          {/* Task Info */}
          <div>
            <p className="text-sm text-text-muted mb-1.5">任务描述</p>
            <p className="text-text-primary">{task.input_text}</p>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-muted">执行进度</p>
              <span className="text-sm font-mono text-text-primary">{task.progress}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  task.status === 'completed' ? 'bg-success' :
                  task.status === 'failed' ? 'bg-danger' :
                  'bg-gradient-to-r from-primary to-accent'
                }`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          {/* Workflow Nodes Timeline */}
          {nodes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-text-muted">工作流节点</p>
                <span className="text-xs text-text-muted">{workflow?.name || '未指定'}</span>
              </div>
              <div className="space-y-0">
                {nodes.map((node, index) => {
                  const nodeStatus = getNodeStatus(index)
                  return (
                    <div key={node.id} className="flex gap-3">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div className="shrink-0 mt-1">
                          {nodeStatusIcons[nodeStatus as keyof typeof nodeStatusIcons]}
                        </div>
                        {index < nodes.length - 1 && (
                          <div className={`w-px h-8 my-1 ${
                            nodeStatus === 'completed' ? 'bg-success/30' : 'bg-border'
                          }`} />
                        )}
                      </div>

                      {/* Node info */}
                      <div className={`flex-1 pb-4 ${index < nodes.length - 1 ? '' : ''}`}>
                        <p className={`text-sm font-medium ${
                          nodeStatus === 'completed' ? 'text-text-primary' :
                          nodeStatus === 'running' ? 'text-primary' : 'text-text-muted'
                        }`}>
                          {node.label}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {nodeStatus === 'completed' ? `已完成 · ~${(index + 1) * 2.5}s` :
                           nodeStatus === 'running' ? '执行中...' :
                           '等待执行'}
                        </p>
                      </div>

                      {/* Agent */}
                      <div className="flex items-start pt-1">
                        <Bot className="w-3.5 h-3.5 text-text-muted" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-surface-2 rounded-lg">
              <p className="text-xs text-text-muted">创建时间</p>
              <p className="text-sm text-text-primary mt-1">
                {new Date(task.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="p-3 bg-surface-2 rounded-lg">
              <p className="text-xs text-text-muted">Token 消耗</p>
              <p className="text-sm text-text-primary mt-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />
                ~{Math.round(task.progress * 85).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-surface-2 rounded-lg">
              <p className="text-xs text-text-muted">执行时间</p>
              <p className="text-sm text-text-primary mt-1">
                {(task.progress * 0.15).toFixed(1)}s
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          {task.status === 'completed' && (
            <button className="px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all flex items-center gap-2">
              <Play className="w-4 h-4" />
              重新执行
            </button>
          )}
          <button className="px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger hover:bg-danger/20 transition-all flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            删除任务
          </button>
        </div>
      </div>
    </div>
  )
}
