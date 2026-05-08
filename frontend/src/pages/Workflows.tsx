import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Workflow, Code2, FileText, Database, Bot, Layers, ArrowRight } from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import { WORKFLOW_CATEGORIES } from '../lib/constants'

const categoryIcons = {
  developer: Code2,
  content: FileText,
  data: Database,
  ai: Bot,
  general: Layers
}

export default function Workflows() {
  const { workflows, loadWorkflows, isLoading } = useWorkflowStore()

  useEffect(() => {
    loadWorkflows()
  }, [])

  // 按分类分组
  const workflowsByCategory = workflows.reduce((acc, wf) => {
    const cat = wf.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(wf)
    return acc
  }, {} as Record<string, typeof workflows>)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">工作流模板</h1>
          <p className="text-text-secondary mt-1">
            选择一个工作流模板，快速开始你的 AI 任务
          </p>
        </div>
        <div className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
          {workflows.length} 个模板
        </div>
      </div>

      {/* Workflow Categories */}
      {Object.entries(workflowsByCategory).map(([category, categoryWorkflows]) => {
        const catConfig = WORKFLOW_CATEGORIES[category as keyof typeof WORKFLOW_CATEGORIES] || WORKFLOW_CATEGORIES.general
        const Icon = categoryIcons[category as keyof typeof categoryIcons] || Layers

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${catConfig.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: catConfig.color }} />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">{catConfig.label}</h2>
              <span className="text-sm text-text-muted">
                {categoryWorkflows.length} 个模板
              </span>
            </div>

            {/* Workflow Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryWorkflows.map((workflow, index) => (
                <WorkflowCard key={workflow.id} workflow={workflow} index={index} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WorkflowCard({ workflow, index }: { workflow: any; index: number }) {
  return (
    <Link
      to={`/workflows/${workflow.id}`}
      className="group glass rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-in block"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
            {workflow.name}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
            {workflow.description}
          </p>
        </div>
      </div>

      {/* Nodes */}
      <div className="mb-4">
        <p className="text-xs text-text-muted mb-2">
          工作流节点 ({workflow.nodes.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {workflow.nodes.slice(0, 5).map((node: any, i: number) => (
            <span
              key={node.id}
              className="px-2 py-1 bg-surface-2 text-xs text-text-secondary rounded"
            >
              {node.label}
            </span>
          ))}
          {workflow.nodes.length > 5 && (
            <span className="px-2 py-1 text-xs text-text-muted">
              +{workflow.nodes.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* DAG Visualization */}
      <div className="h-16 bg-surface-2 rounded-lg p-2 mb-4 overflow-hidden">
        <div className="flex items-center justify-center h-full gap-1">
          {workflow.nodes.map((node: any, i: number) => (
            <div key={node.id} className="flex items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ backgroundColor: '#6366f1', color: 'white' }}
              >
                {i + 1}
              </div>
              {i < workflow.nodes.length - 1 && (
                <div className="w-4 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <span className="w-full py-2 bg-surface-2 group-hover:bg-primary/10 border border-border group-hover:border-primary/30 rounded-lg text-sm text-text-secondary group-hover:text-primary transition-all flex items-center justify-center gap-2">
        打开编辑器
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  )
}
