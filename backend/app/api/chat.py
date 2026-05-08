"""Chat API — 使用 AIService（带 Tool Calling 支持）"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
import httpx

from app.services.ai_service import AIService


router = APIRouter()

# 创建 AI 服务实例
ai_service = AIService()


class ChatRequest(BaseModel):
    messages: List[dict]
    model: str = "deepseek-chat"
    stream: bool = True
    api_key: str = ""
    api_base_url: str = ""
    workspace_id: Optional[str] = None  # 工作空间 ID（用于 Tool Calling）


@router.post("/chat")
async def chat(request: ChatRequest):
    """统一 AI 聊天接口（支持 Tool Calling）"""
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API Key is required")

    # 配置 AI 服务
    ai_service.api_key = request.api_key
    ai_service.base_url = request.api_base_url if request.api_base_url else None
    ai_service.use_mock = False

    if request.stream:
        return StreamingResponse(
            stream_chat_with_tool_support(request, ai_service),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )
    else:
        # 非流式：直接调用 AI 服务
        try:
            result = await ai_service.chat(
                messages=request.messages,
                model=request.model,
                workspace_id=request.workspace_id
            )
            return result
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


async def stream_chat_with_tool_support(request: ChatRequest, ai_service: AIService):
    """
    流式聊天 + Tool Calling 支持
    由于 SSE 流式不支持多轮 tool calls，这里采用：
    1. 先发送请求，检查是否有 tool_calls
    2. 如果有，先执行工具，再发送最终响应（非流式）
    3. 如果没有，正常流式输出
    """
    try:
        # 先进行一次非流式请求，检查是否需要调用工具
        test_result = await ai_service.chat(
            messages=request.messages,
            model=request.model,
            workspace_id=request.workspace_id
        )
    except Exception as e:
        # 将错误以 SSE 事件返回，避免前端收到 200 后流断开卡在"思考中"
        error_msg = str(e)
        yield f"data: {json.dumps({'error': {'message': error_msg}})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # 检查是否有工具调用
    if "tool_calls" in test_result and test_result["tool_calls"]:
        # 有工具调用：将工具执行结果转换为前端期望的 executions 格式
        if "tool_results" in test_result:
            executions = []
            for tr in test_result["tool_results"]:
                result = tr.get("result", {})
                executions.append({
                    "tool": tr.get("tool", ""),
                    "language": result.get("language", ""),
                    "exit_code": result.get("exit_code", 0),
                    "stdout": result.get("stdout", ""),
                    "stderr": result.get("stderr", ""),
                    "duration_ms": result.get("duration_ms", 0),
                    "success": result.get("success", True),
                    "timed_out": result.get("timed_out", False),
                })
            yield f"data: {json.dumps({'type': 'executions', 'results': executions}, ensure_ascii=False)}\n\n"

        # 发送最终响应（含 content）
        content = test_result.get("content", "")
        yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"
    else:
        # Mock 或真实 API：直接复用第一次请求的结果模拟流式输出
        # 避免先非流式探测 tool_calls 后再做第二次流式请求浪费额度
        content = test_result.get("content", "")
        
        # Mock：逐词模拟
        if not request.api_key or request.api_key == "mock":
            words = content.split()
            for i in range(len(words)):
                chunk = " ".join(words[:i+1])
                yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.05)
        else:
            # 真实 API：直接一次性吐出内容（前端已有 streaming UI 适配）
            yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)}\n\n"
        
        yield "data: [DONE]\n\n"
