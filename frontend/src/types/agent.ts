export interface Agent {
  id: string
  name: string
  role: string
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error'
  current_thought?: string
  output?: string
  tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  error?: string
}

export interface AgentThinking {
  agent_id: string
  agent_name: string
  thought: string
  status: string
  timestamp: string
}

export interface PipelineResult {
  [agentId: string]: {
    name: string
    role: string
    output: string
    tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    status: string
    error?: string
  }
}
