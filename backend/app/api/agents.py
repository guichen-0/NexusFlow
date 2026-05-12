from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.core.agent_orchestrator import run_agent_pipeline, AGENT_DEFS

router = APIRouter()


# ========== 数据模型 ==========
class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    status: str
    current_thought: Optional[str] = None


class OrchestrateRequest(BaseModel):
    task: str
    api_key: str = ""
    api_base_url: str = ""
    api_format: str = "openai"
    model: str = ""
    system_prompt: str = ""  # Skill 注入的系统提示词


# ========== API ==========

@router.get("/", response_model=List[AgentResponse])
async def list_agents():
    """列出所有可用 Agent"""
    return [
        AgentResponse(
            id=agent.id,
            name=agent.name,
            role=agent.role,
            status="idle",
        )
        for agent in AGENT_DEFS.values()
    ]


@router.post("/orchestrate")
async def orchestrate_agents(request: OrchestrateRequest):
    """编排 Agent 流水线 — SSE 流式返回每个 Agent 的状态和输出"""
    if not request.task.strip():
        raise HTTPException(status_code=400, detail="任务描述不能为空")

    if not request.api_key:
        raise HTTPException(status_code=400, detail="请先在设置中配置 API Key")

    model = request.model or None

    return StreamingResponse(
        run_agent_pipeline(
            user_task=request.task,
            api_key=request.api_key,
            api_base_url=request.api_base_url,
            api_format=request.api_format,
            model=model,
            system_prompt=request.system_prompt or None,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
