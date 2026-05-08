import { useEffect } from 'react'
import { Play, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Eye } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'

export default function Tasks() {
  const { tasks, loadTasks, isLoading } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />
      case 'running':
        return <Play className="w-4 h-4 text-primary animate-pulse" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger" />
      default:
        return <Clock className="w-4 h-4 text-warning" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '已完成',
      running: '运行中',
      pending: '等待中',
      failed: '失败'
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">任务列表</h1>
          <p className="text-text-secondary mt-1">
            查看和管理所有 AI 任务
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-success/10 text-success text-sm font-medium rounded-full">
            {tasks.filter(t => t.status === 'completed').length} 已完成
          </span>
          <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
            {tasks.filter(t => t.status === 'running').length} 运行中
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">状态</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">任务描述</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">工作流</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">进度</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">创建时间</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-text-muted">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className="border-b border-border/50 hover:bg-surface-2/50 transition-colors animate-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <span className={`text-sm font-medium ${
                      task.status === 'completed' ? 'text-success' :
                      task.status === 'running' ? 'text-primary' :
                      task.status === 'failed' ? 'text-danger' : 'text-warning'
                    }`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-text-primary max-w-md truncate">
                    {task.input_text}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-surface-2 text-xs text-text-secondary rounded">
                    {task.workflow_id || '未指定'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          task.status === 'completed' ? 'bg-success' :
                          task.status === 'failed' ? 'bg-danger' :
                          'bg-gradient-to-r from-primary to-accent'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{task.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-text-secondary">
                    {new Date(task.created_at).toLocaleString('zh-CN')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors group">
                      <Eye className="w-4 h-4 text-text-muted group-hover:text-text-primary" />
                    </button>
                    <button className="p-2 hover:bg-danger/10 rounded-lg transition-colors group">
                      <Trash2 className="w-4 h-4 text-text-muted group-hover:text-danger" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">暂无任务</p>
            <p className="text-sm text-text-muted mt-1">
              在工作台创建一个新任务开始体验
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
