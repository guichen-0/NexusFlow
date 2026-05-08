import { useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  NodeProps,
  Handle,
} from '@xyflow/react'

// Cast to make TypeScript accept it as a JSX component
const Flow = ReactFlow as any as React.ComponentType<any>
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Info, CheckCircle2, Loader2, Clock, AlertCircle, Zap } from 'lucide-react'
import { mockWorkflowTemplates } from '../services/mock'
import type { WorkflowNode } from '../types/workflow'

const nodeStatusColors: Record<string, string> = {
  pending: '#64748b',
  running: '#6366f1',
  completed: '#10b981',
  failed: '#ef4444',
}

const nodeTypeIcons: Record<string, string> = {
  analyze: '🔍', generate: '⚡', review: '📋', fix: '🔧', report: '📄',
  topic: '💡', outline: '📝', write: '✏️', illustrate: '🎨', format: '📐',
  parse: '📊', process: '⚙️', check: '✅', summary: '📦',
  schema: '🏗️', validate: '✔️', augment: '🔄', export: '💾', verify: '🎯',
  detect: '🌐', translate: '🗣️', publish: '🚀',
  scan: '🔬', suggest: '💭', test: '🧪',
  'gen-case': '📋', 'gen-data': '📂', execute: '▶️',
  intent: '🎯', flow: '🔄', train: '🧠',
}

// Custom glass-morphism node component
function WorkflowNodeComponent({ data }: NodeProps) {
  const color = (data.status && typeof data.status === 'string')
    ? (nodeStatusColors as any)[data.status] || '#64748b'
    : '#64748b'
  const icon = (typeof data.icon === 'string') ? data.icon : '⚡'

  return (
    <div
      className="px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-200 hover:shadow-lg min-w-[160px]"
      style={{
        background: 'rgba(18, 18, 26, 0.85)',
        borderColor: `${color}50`,
        boxShadow: data.status === 'running' ? `0 0 20px ${color}25` : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #12121a',
        }}
      />
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary leading-tight">{String(data.label)}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-text-muted" style={{ color }}>
              {String(data.statusText || '等待中')}
            </span>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #12121a',
        }}
      />
    </div>
  )
}

const nodeTypes = { workflowNode: WorkflowNodeComponent }

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)

  const workflow = useMemo(
    () => mockWorkflowTemplates.find(w => w.id === id),
    [id]
  )

  // Convert workflow nodes to React Flow elements with layered layout
  const { nodes, edges } = useMemo(() => {
    if (!workflow?.nodes) return { nodes: [] as Node[], edges: [] as Edge[] }

    // Calculate levels based on dependencies (topological)
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]))
    const levels = new Map<string, number>()

    function getLevel(nodeId: string): number {
      if (levels.has(nodeId)) return levels.get(nodeId)!
      const node = nodeMap.get(nodeId)
      if (!node || !node.depends_on.length) {
        levels.set(nodeId, 0)
        return 0
      }
      const maxDepLevel = Math.max(...node.depends_on.map(d => getLevel(d)))
      levels.set(nodeId, maxDepLevel + 1)
      return maxDepLevel + 1
    }

    workflow.nodes.forEach(n => getLevel(n.id))

    // Group by level for positioning
    const levelGroups = new Map<number, typeof workflow.nodes>()
    workflow.nodes.forEach(n => {
      const lvl = levels.get(n.id) ?? 0
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, [])
      levelGroups.get(lvl)!.push(n)
    })

    const LEVEL_X_GAP = 280
    const NODE_Y_GAP = 120

    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []

    workflow.nodes.forEach((node, idx) => {
      const lvl = levels.get(node.id) ?? 0
      const siblings = levelGroups.get(lvl) ?? [node]
      const siblingIdx = siblings.indexOf(node)

      flowNodes.push({
        id: node.id,
        type: 'workflowNode',
        position: {
          x: siblingIdx * NODE_Y_GAP + 60,
          y: lvl * LEVEL_X_GAP + 40,
        },
        data: {
          label: node.label,
          nodeType: node.type,
          status: idx === 1 ? 'running' : idx === 0 ? 'completed' : 'pending',
          statusText: idx === 0 ? '已完成' : idx === 1 ? '执行中' : '等待中',
          icon: nodeTypeIcons[node.type] || '⚡',
        },
      })
    })

    // Create edges from dependencies
    workflow.nodes.forEach(node => {
      node.depends_on.forEach(depId => {
        flowEdges.push({
          id: `${depId}-${node.id}`,
          source: depId,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#4a4a7e', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#4a4a7e' },
        })
      })
    })

    return { nodes: flowNodes, edges: flowEdges }
  }, [workflow])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const originalNode = workflow?.nodes.find(n => n.id === node.id)
    setSelectedNode(originalNode ?? null)
  }, [workflow])

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in">
        <AlertCircle className="w-12 h-12 text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">工作流未找到</h2>
        <p className="text-text-secondary mb-6">请检查 URL 或返回工作流列表选择模板</p>
        <Link
          to="/workflows"
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          返回工作流列表
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-xl font-bold text-text-primary">{workflow.name}</h1>
            <p className="text-xs text-text-muted mt-0.5">{workflow.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
            {workflow.nodes.length} 个节点
          </span>
          <button className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Zap className="w-4 h-4" />
            执行工作流
          </button>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 glass rounded-xl overflow-hidden relative" style={{ minHeight: '500px', height: 'calc(100% - 80px)' }}>
        <Flow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          style={{ background: '#0a0a0f', width: '100%', height: '100%' }}
        >
          <Background gap={24} size={1} color="#2a2a3e" />
          <Controls showInteractive={false} style={{ backgroundColor: '#12121a', borderColor: '#2a2a3e' }} />
          <MiniMap
            nodeColor={() => '#6366f130'}
            maskColor="rgba(10, 10, 15, 0.75)"
            style={{ backgroundColor: '#12121a', borderColor: '#2a2a3e' }}
          />
        </Flow>

        {/* Selected Node Detail Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 glass rounded-xl p-5 z-10 animate-in">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{nodeTypeIcons[selectedNode.type] || '⚡'}</span>
                <h3 className="font-semibold text-text-primary">{selectedNode.label}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-text-primary transition-colors text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <InfoRow label="节点 ID" value={selectedNode.id} mono />
              <InfoRow label="节点类型" value={selectedNode.type} mono />
              <InfoRow
                label="依赖节点"
                value={selectedNode.depends_on.length > 0 ? selectedNode.depends_on.join(', ') : '无（起始节点）'}
              />

              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">预计耗时</span>
                  <span className="text-xs text-text-primary ml-auto">~{Math.floor(Math.random() * 15) + 3}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs text-text-secondary">预计 Token</span>
                  <span className="text-xs text-text-primary ml-auto">~{Math.floor(Math.random() * 5000) + 500}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs text-text-secondary">状态</span>
                  <span className="ml-auto text-xs font-medium text-warning">等待执行</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-text-primary mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
