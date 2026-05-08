import { create } from 'zustand'
import { Workflow, NodeExecution } from '../types/workflow'
import { Agent } from '../types/agent'
import { mockWorkflowTemplates, mockAgentProcess } from '../services/mock'

interface WorkflowState {
  // 工作流列表
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  isLoading: boolean

  // 节点执行状态
  nodeExecutions: Record<string, NodeExecution>

  // Agent 协作状态
  agents: Agent[]
  isAgentRunning: boolean

  // 操作
  setWorkflows: (workflows: Workflow[]) => void
  selectWorkflow: (workflow: Workflow | null) => void
  loadWorkflows: () => Promise<void>
  updateNodeExecution: (nodeId: string, execution: Partial<NodeExecution>) => void
  resetNodeExecutions: () => void
  updateAgent: (agentId: string, updates: Partial<Agent>) => void
  setAgentRunning: (running: boolean) => void
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflow: null,
  isLoading: false,
  nodeExecutions: {},
  agents: [],
  isAgentRunning: false,

  setWorkflows: (workflows) => set({ workflows }),

  selectWorkflow: (workflow) => {
    set({ selectedWorkflow: workflow })
    if (workflow) {
      // 初始化节点执行状态
      const executions: Record<string, NodeExecution> = {}
      workflow.nodes.forEach(node => {
        executions[node.id] = {
          node_id: node.id,
          status: 'pending'
        }
      })
      set({ nodeExecutions: executions })
    }
  },

  loadWorkflows: async () => {
    set({ isLoading: true })
    try {
      // 使用 mock 数据
      set({ workflows: mockWorkflowTemplates })
    } finally {
      set({ isLoading: false })
    }
  },

  updateNodeExecution: (nodeId, execution) => {
    set(state => ({
      nodeExecutions: {
        ...state.nodeExecutions,
        [nodeId]: {
          ...state.nodeExecutions[nodeId],
          ...execution
        }
      }
    }))
  },

  resetNodeExecutions: () => {
    set({ nodeExecutions: {} })
  },

  updateAgent: (agentId, updates) => {
    set(state => ({
      agents: state.agents.map(agent =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      )
    }))
  },

  setAgentRunning: (running) => set({ isAgentRunning: running })
}))
