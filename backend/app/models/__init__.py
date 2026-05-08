from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# 任务模型
class TaskCreate(BaseModel):
    input_text: str
    workflow_id: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    id: str
    input_text: str
    workflow_id: Optional[str] = None
    status: str
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# 工作流模型
class WorkflowNode(BaseModel):
    id: str
    type: str
    label: str
    depends_on: List[str] = []

class WorkflowCreate(BaseModel):
    name: str
    description: str
    nodes: List[WorkflowNode]
    category: str = "general"

class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    nodes: List[WorkflowNode]
    category: str
    created_at: str

# Agent 模型
class AgentThinking(BaseModel):
    agent_id: str
    agent_name: str
    thought: str
    status: str  # thinking, working, completed
    timestamp: datetime

class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    status: str
    current_thought: Optional[str] = None

# 分析模型
class TokenUsage(BaseModel):
    date: str
    tokens: int
    requests: int

class ExecutionRecord(BaseModel):
    id: str
    workflow_name: str
    status: str
    started_at: str
    duration: int  # 秒
    tokens_used: int

class AnalyticsSummary(BaseModel):
    total_executions: int
    successful_executions: int
    success_rate: float
    total_tokens: int
    avg_execution_time: float
    active_workflows: int

# 通用响应
class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
