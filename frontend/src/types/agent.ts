export interface Agent {
  id: string
  name: string
  role: string
  status: 'idle' | 'thinking' | 'working' | 'completed'
  current_thought?: string
}

export interface AgentThinking {
  agent_id: string
  agent_name: string
  thought: string
  status: string
  timestamp: string
}
