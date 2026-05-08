from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

# Agent 数据模型
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

# 模拟 Agent 数据
AGENT_TEMPLATES = {
    "analyze": {"name": "需求分析 Agent", "role": "需求理解专家"},
    "generate": {"name": "代码生成 Agent", "role": "全栈开发专家"},
    "review": {"name": "代码审查 Agent", "role": "代码质量专家"},
    "fix": {"name": "自动修复 Agent", "role": "调试专家"},
    "report": {"name": "报告生成 Agent", "role": "文档编写专家"}
}

@router.get("/", response_model=List[AgentResponse])
async def list_agents():
    """列出所有可用 Agent"""
    agents = []
    for agent_id, template in AGENT_TEMPLATES.items():
        agents.append(AgentResponse(
            id=agent_id,
            name=template["name"],
            role=template["role"],
            status="idle"
        ))
    return agents

@router.get("/{agent_id}/thinking")
async def get_agent_thinking(agent_id: str, task_id: Optional[str] = None):
    """获取 Agent 的'思考过程'（Mock）"""
    if agent_id not in AGENT_TEMPLATES:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 模拟思考过程
    thoughts = [
        {"thought": f"分析任务需求...", "status": "thinking", "timestamp": datetime.now().isoformat()},
        {"thought": f"设计解决方案...", "status": "working", "timestamp": datetime.now().isoformat()},
        {"thought": f"生成结果...", "status": "completed", "timestamp": datetime.now().isoformat()}
    ]

    return {"agent_id": agent_id, "thoughts": thoughts}

@router.post("/orchestrate")
async def orchestrate_agents(workflow_id: str, input_text: str):
    """编排多个 Agent 协作完成任务"""
    # 模拟编排过程
    import asyncio

    agent_sequence = get_workflow_agents(workflow_id)

    results = []
    for agent_id in agent_sequence:
        # 模拟 Agent 执行
        await asyncio.sleep(0.3)
        results.append({
            "agent_id": agent_id,
            "agent_name": AGENT_TEMPLATES.get(agent_id, {}).get("name", agent_id),
            "status": "completed",
            "output_summary": f"{AGENT_TEMPLATES.get(agent_id, {}).get('role', '')} 完成任务"
        })

    return {"workflow_id": workflow_id, "agents": results, "status": "completed"}

def get_workflow_agents(workflow_id: str) -> List[str]:
    """获取工作流所需的 Agent 序列"""
    mapping = {
        "code-factory": ["analyze", "generate", "review", "fix", "report"],
        "content-pipeline": ["topic", "outline", "write", "illustrate", "format"],
        "batch-processor": ["parse", "process", "check", "summary"]
    }
    return mapping.get(workflow_id, ["analyze", "generate", "report"])
