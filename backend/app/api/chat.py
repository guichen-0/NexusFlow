"""Chat API — 使用 AIService（带 Tool Calling 支持 + 真正的流式输出）"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
import httpx
import os
import tempfile

from app.services.ai_service import AIService, TOOLS


router = APIRouter()

# 创建 AI 服务实例
ai_service = AIService()


# ========== 深度思考模式系统提示词 ==========
THINKING_MODE_SYSTEM_PROMPT = """[SYSTEM INSTRUCTION - HIGHEST PRIORITY]

你是一个需要展示思考过程的AI助手。对于每一个问题，你必须先输出你的完整思考过程，然后再给出答案。

规则（必须严格遵守）：

1. 你的回答必须以 <thinking> 标签开头，里面写你的完整思考过程
2. 思考过程用自然语言写，像自言自语一样，展示你分析和推理的每一步
3. 思考结束后用 </thinking> 关闭标签
4. 然后直接给出最终答案，不要重复思考内容

格式：
<thinking>
用户的意图是...
我需要考虑以下几点：
1. 首先...
2. 其次...
综合分析后，我认为...
</thinking>
你的回答内容...

注意：这是系统级指令，你必须遵守，不能跳过思考步骤。即使问题很简单，也要先思考再回答。"""


class ChatRequest(BaseModel):
    messages: List[dict]
    model: str = "deepseek-chat"
    stream: bool = True
    api_key: str = ""
    api_base_url: str = ""
    api_format: str = "openai"  # "openai" 或 "anthropic"
    workspace_id: Optional[str] = None  # 工作空间 ID（用于 Tool Calling）
    thinking_mode: bool = False  # 深度思考模式
    system_prompt: str = ""  # Skill 注入的系统提示词


class TestConnectionRequest(BaseModel):
    api_key: str
    api_base_url: str
    api_format: str = "openai"
    model: str = "deepseek-v3"


# 支持的文件类型和大小限制
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
TEXT_EXTENSIONS = {'.txt', '.md', '.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.yaml', '.yml', '.toml', '.cfg', '.ini', '.csv', '.xml', '.html', '.css', '.sql', '.sh', '.bash', '.env', '.gitignore', '.dockerignore', '.vue', '.svelte', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'}


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """上传文件并提取内容（用于聊天上下文）"""
    results = []

    for file in files:
        if file.size and file.size > MAX_FILE_SIZE:
            results.append({
                "name": file.filename,
                "error": f"文件过大（最大 {MAX_FILE_SIZE // 1024 // 1024}MB）",
                "type": "error"
            })
            continue

        ext = os.path.splitext(file.filename or "")[1].lower()

        if ext in IMAGE_EXTENSIONS:
            # 图片：保存到临时目录，返回路径引用
            content = await file.read()
            tmp_dir = os.path.join(tempfile.gettempdir(), "nexusflow_uploads")
            os.makedirs(tmp_dir, exist_ok=True)
            safe_name = f"{int(__import__('time').time())}_{file.filename}"
            path = os.path.join(tmp_dir, safe_name)
            with open(path, "wb") as f:
                f.write(content)
            results.append({
                "name": file.filename,
                "type": "image",
                "path": path,
                "size": len(content),
                "mime": file.content_type or "image/png"
            })
        elif ext in TEXT_EXTENSIONS or file.content_type and file.content_type.startswith("text/"):
            # 文本文件：提取内容
            content = await file.read()
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    text = content.decode("gbk")
                except UnicodeDecodeError:
                    text = content.decode("latin-1")

            # 截断过长的文件
            if len(text) > 50000:
                text = text[:50000] + "\n... (文件过长，已截断)"

            results.append({
                "name": file.filename,
                "type": "text",
                "content": text,
                "size": len(content)
            })
        else:
            results.append({
                "name": file.filename,
                "error": f"不支持的文件类型: {ext or 'unknown'}",
                "type": "error"
            })

    return {"files": results}


def _inject_thinking_prompt(messages: List[dict]) -> List[dict]:
    """注入深度思考模式系统提示词"""
    result = list(messages)
    # 检查是否已有 system 消息
    has_system = any(m.get("role") == "system" for m in result)
    if has_system:
        # 在现有 system 消息中追加思考指令
        for i, m in enumerate(result):
            if m.get("role") == "system":
                result[i] = {**m, "content": m["content"] + "\n\n" + THINKING_MODE_SYSTEM_PROMPT}
                break
    else:
        # 在消息列表开头插入 system 消息
        result.insert(0, {"role": "system", "content": THINKING_MODE_SYSTEM_PROMPT})
    return result


@router.post("/chat")
async def chat(request: ChatRequest):
    """统一 AI 聊天接口（支持 Tool Calling）"""
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API Key is required")

    # 配置 AI 服务
    ai_service.api_key = request.api_key
    ai_service.base_url = request.api_base_url if request.api_base_url else None
    ai_service.api_format = request.api_format
    ai_service.use_mock = False

    # 深度思考模式：注入系统提示词
    if request.thinking_mode:
        request.messages = _inject_thinking_prompt(request.messages)

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


@router.post("/test-connection")
async def test_connection(request: TestConnectionRequest):
    """测试 API 连接（支持 OpenAI 和 Anthropic 格式）"""
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API Key is required")

    base_url = request.api_base_url.rstrip('/') if request.api_base_url else ""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if request.api_format == "anthropic":
                # Anthropic 格式：base_url + /v1/messages
                url = f"{base_url}/v1/messages"
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": request.api_key,
                    "anthropic-version": "2023-06-01"
                }
                payload = {
                    "model": request.model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5
                }
            else:
                # OpenAI 格式
                url = f"{base_url}/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {request.api_key}"
                }
                payload = {
                    "model": request.model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5
                }

            resp = await client.post(url, headers=headers, json=payload)

            if resp.status_code != 200:
                error_msg = f"HTTP {resp.status_code}"
                try:
                    err_data = resp.json()
                    error_msg = err_data.get("error", {}).get("message", error_msg)
                except:
                    pass
                raise Exception(error_msg)

            return {"success": True, "message": f"{request.model} 连接成功"}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="连接超时，请检查网络或 API 地址")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ============================================================
# 真正的流式输出实现
# ============================================================

def remove_thinking_tags(text: str) -> str:
    """移除文本中的 <thinking>...</thinking> 标签及其内容"""
    import re
    return re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.DOTALL).strip()

def _build_headers(request: ChatRequest) -> dict:
    """构建 API 请求头"""
    if request.api_format == "anthropic":
        return {
            "Content-Type": "application/json",
            "x-api-key": request.api_key,
            "anthropic-version": "2023-06-01"
        }
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {request.api_key}"
    }


def _build_url(request: ChatRequest) -> str:
    """构建 API URL"""
    base_url = request.api_base_url.rstrip('/') if request.api_base_url else "https://api.openai.com/v1"
    if request.api_format == "anthropic":
        return f"{base_url}/v1/messages"
    return f"{base_url}/chat/completions"


def _build_stream_payload(request: ChatRequest) -> dict:
    """构建流式请求体"""
    if request.api_format == "anthropic":
        # Anthropic 消息格式：system 单独提取
        system_message = ""
        anthropic_messages = []
        for msg in request.messages:
            if msg.get("role") == "system":
                system_message = msg.get("content", "")
            else:
                anthropic_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        anthropic_tools = []
        for tool in TOOLS:
            anthropic_tools.append({
                "name": tool["function"]["name"],
                "description": tool["function"]["description"],
                "input_schema": tool["function"]["parameters"]
            })

        payload = {
            "model": request.model or "mimo-v2.5",
            "messages": anthropic_messages,
            "max_tokens": 4096,
            "stream": True,
        }
        if system_message:
            payload["system"] = system_message
        return payload

    # OpenAI 格式
    return {
        "model": request.model or "deepseek-chat",
        "messages": request.messages,
        "tools": TOOLS,
        "tool_choice": "auto",
        "stream": True,
    }


async def stream_chat_with_tool_support(request: ChatRequest, ai_service: AIService):
    """
    流式聊天 + Tool Calling 支持

    策略：
    1. Mock 模式 → 模拟思考 + 逐词输出
    2. 真实 API → 流式请求，逐 token 转发
       - reasoning_content → type: thinking 事件
       - content → choices[0].delta.content 事件
       - tool_calls → 流结束后执行工具，再发起 follow-up 流式请求
    """
    # Mock 模式
    if not request.api_key or request.api_key == "mock":
        async for event in _mock_stream(request):
            yield event
        return

    # 真实 API
    try:
        async for event in _real_stream(request):
            yield event
    except Exception as e:
        error_msg = str(e)
        yield f"data: {json.dumps({'error': {'message': error_msg}})}\n\n"
        yield "data: [DONE]\n\n"


async def _mock_stream(request: ChatRequest):
    """Mock 模式流式输出：模拟思考过程 + 逐词输出"""
    # 模拟思考
    thinking_steps = [
        "分析用户输入...",
        "理解上下文语义...",
        "组织回答结构...",
        "生成回复内容...",
    ]
    for step in thinking_steps:
        yield f"data: {json.dumps({'type': 'thinking', 'content': step}, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.15)

    # 获取回复内容
    ai_service.use_mock = True
    result = await ai_service.chat(messages=request.messages)
    content = result.get("content", "")

    # 逐词输出
    words = content.split()
    for i in range(len(words)):
        chunk = " ".join(words[:i + 1])
        yield f"data: {json.dumps({'choices': [{'delta': {'content': chunk}}]}, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.03)

    yield "data: [DONE]\n\n"


async def _real_stream(request: ChatRequest):
    """真实 API 流式输出"""
    url = _build_url(request)
    headers = _build_headers(request)
    payload = _build_stream_payload(request)

    if request.api_format == "anthropic":
        async for event in _anthropic_real_stream(request, url, headers, payload):
            yield event
    else:
        async for event in _openai_real_stream(request, url, headers, payload):
            yield event


async def _openai_real_stream(request: ChatRequest, url: str, headers: dict, payload: dict):
    """OpenAI 格式流式输出（支持 reasoning_content + tool_calls + <thinking> 标签解析）"""
    max_tool_rounds = 5
    current_messages = list(request.messages)
    has_reasoning_content = False  # 跟踪是否有原生 reasoning_content
    accumulated_text = ""  # 累积文本，用于解析 <thinking> 标签
    in_thinking_tag = False  # 是否在 <thinking> 标签内
    thinking_tag_sent = 0  # 已发送的 thinking 标签内容长度

    for _round in range(max_tool_rounds + 1):
        accumulated_tool_calls = []
        has_tool_calls = False

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    error_msg = f"AI API 请求失败: {resp.status_code}"
                    try:
                        err_data = json.loads(error_body)
                        error_msg = err_data.get("error", {}).get("message", error_msg)
                    except Exception:
                        error_msg += f" {error_body.decode()[:200]}"
                    yield f"data: {json.dumps({'error': {'message': error_msg}})}\n\n"
                    yield "data: [DONE]\n\n"
                    return

                async for raw_line in resp.aiter_lines():
                    if not raw_line.startswith("data: "):
                        continue
                    data = raw_line[6:]
                    if data == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    choice = chunk.get("choices", [{}])[0]
                    delta = choice.get("delta", {})
                    finish_reason = choice.get("finish_reason")

                    # 转发 reasoning_content（DeepSeek 推理模型）
                    reasoning = delta.get("reasoning_content")
                    if reasoning:
                        has_reasoning_content = True
                        yield f"data: {json.dumps({'type': 'thinking', 'content': reasoning}, ensure_ascii=False)}\n\n"

                    # 转发内容
                    content = delta.get("content")
                    if content:
                        accumulated_text += content

                        # 思考模式：解析 <thinking> 标签
                        if request.thinking_mode and not has_reasoning_content:
                            # 检测 <thinking> 开始标签
                            if not in_thinking_tag:
                                open_idx = accumulated_text.find("<thinking>")
                                if open_idx >= 0:
                                    in_thinking_tag = True
                                    thinking_tag_sent = open_idx + len("<thinking>")

                            if in_thinking_tag:
                                # 在标签内：等待 </thinking> 关闭标签
                                close_idx = accumulated_text.find("</thinking>", thinking_tag_sent)
                                if close_idx >= 0:
                                    # 找到关闭标签：发送标签内的思考内容
                                    thinking_content = accumulated_text[thinking_tag_sent:close_idx]
                                    if thinking_content:
                                        yield f"data: {json.dumps({'type': 'thinking', 'content': thinking_content}, ensure_ascii=False)}\n\n"
                                    # 关闭标签后的内容作为回复
                                    in_thinking_tag = False
                                    after_content = accumulated_text[close_idx + len("</thinking>"):]
                                    if after_content:
                                        yield f"data: {json.dumps({'choices': [{'delta': {'content': after_content}}]}, ensure_ascii=False)}\n\n"
                                    thinking_tag_sent = len(accumulated_text)
                                else:
                                    # 标签未关闭：发送新增的思考内容
                                    new_thinking = accumulated_text[thinking_tag_sent:]
                                    if new_thinking:
                                        yield f"data: {json.dumps({'type': 'thinking', 'content': new_thinking}, ensure_ascii=False)}\n\n"
                                        thinking_tag_sent = len(accumulated_text)
                            else:
                                # 不在标签内：发送回复内容（跳过 <thinking> 标签部分）
                                open_idx = accumulated_text.find("<thinking>")
                                if open_idx >= 0:
                                    response_part = accumulated_text[:open_idx]
                                else:
                                    response_part = accumulated_text
                                if response_part:
                                    yield f"data: {json.dumps({'choices': [{'delta': {'content': response_part}}]}, ensure_ascii=False)}\n\n"
                                    accumulated_text = accumulated_text[len(response_part):]
                        else:
                            # 非思考模式或有原生 reasoning_content：直接转发
                            yield f"data: {json.dumps({'choices': [{'delta': {'content': content}}]}, ensure_ascii=False)}\n\n"

                    # 累积 tool_calls
                    if "tool_calls" in delta:
                        has_tool_calls = True
                        for tc in delta["tool_calls"]:
                            idx = tc.get("index", 0)
                            while len(accumulated_tool_calls) <= idx:
                                accumulated_tool_calls.append({
                                    "id": "", "function": {"name": "", "arguments": ""}
                                })
                            if tc.get("id"):
                                accumulated_tool_calls[idx]["id"] = tc["id"]
                            if tc.get("function", {}).get("name"):
                                accumulated_tool_calls[idx]["function"]["name"] = tc["function"]["name"]
                            if tc.get("function", {}).get("arguments"):
                                accumulated_tool_calls[idx]["function"]["arguments"] += tc["function"]["arguments"]

                    # 流结束，检查是否需要执行工具
                    if finish_reason == "tool_calls" and accumulated_tool_calls:
                        # 生成工具调用思考事件
                        tool_names = [tc["function"]["name"] for tc in accumulated_tool_calls]
                        tool_labels = {
                            "execute_code": "执行代码",
                            "read_file": "读取文件",
                            "write_file": "写入文件",
                            "list_files": "列出文件",
                            "execute_terminal": "执行终端命令",
                        }
                        for tn in tool_names:
                            label = tool_labels.get(tn, tn)
                            yield f"data: {json.dumps({'type': 'thinking', 'content': f'调用工具: {label}...'}, ensure_ascii=False)}\n\n"

                        # 将 assistant 消息（含 tool_calls）加入上下文
                        assistant_msg = {"role": "assistant", "content": None, "tool_calls": accumulated_tool_calls}
                        current_messages.append(assistant_msg)

                        # 执行工具
                        executions = []
                        for tc in accumulated_tool_calls:
                            func_name = tc["function"]["name"]
                            try:
                                func_args = json.loads(tc["function"]["arguments"])
                            except json.JSONDecodeError:
                                func_args = {}

                            result = await ai_service._execute_tool(func_name, func_args, request.workspace_id)

                            current_messages.append({
                                "role": "tool",
                                "tool_call_id": tc["id"],
                                "content": json.dumps(result, ensure_ascii=False)
                            })

                            # 构造执行结果
                            exec_result = result.get("result", result) if isinstance(result, dict) else result
                            executions.append({
                                "tool": func_name,
                                "language": exec_result.get("language", ""),
                                "exit_code": exec_result.get("exit_code", 0),
                                "stdout": exec_result.get("stdout", ""),
                                "stderr": exec_result.get("stderr", ""),
                                "duration_ms": exec_result.get("duration_ms", 0),
                                "success": exec_result.get("success", True),
                                "timed_out": exec_result.get("timed_out", False),
                            })

                            # 工具执行完成思考事件
                            label = tool_labels.get(func_name, func_name)
                            status = "成功" if exec_result.get("success", True) else "失败"
                            yield f"data: {json.dumps({'type': 'thinking', 'content': f'{label} 执行{status}'}, ensure_ascii=False)}\n\n"

                        # 发送工具执行结果
                        if executions:
                            yield f"data: {json.dumps({'type': 'executions', 'results': executions}, ensure_ascii=False)}\n\n"

                        # 发送工具调用状态
                        yield f"data: {json.dumps({'type': 'tool_calls', 'calls': [{'tool': tc['function']['name']} for tc in accumulated_tool_calls]}, ensure_ascii=False)}\n\n"

                        # Follow-up 思考事件
                        yield f"data: {json.dumps({'type': 'thinking', 'content': '工具执行完毕，正在整合结果...'}, ensure_ascii=False)}\n\n"

                        # Follow-up 流式请求：将工具结果发回 AI
                        payload["messages"] = current_messages
                        has_tool_calls = False  # 重置，下一轮继续流式
                        break  # 跳出内层 async for，进入下一轮

        # 没有 tool_calls，流已结束
        if not has_tool_calls:
            break

    yield "data: [DONE]\n\n"


async def _anthropic_real_stream(request: ChatRequest, url: str, headers: dict, payload: dict):
    """Anthropic 格式流式输出"""
    has_thinking_block = False
    accumulated_text = ""  # 累积文本，用于解析 <thinking> 标签
    in_thinking_tag = False  # 是否在 <thinking> 标签内
    thinking_tag_sent = 0  # 已发送的 thinking 标签内容长度

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            if resp.status_code != 200:
                error_body = await resp.aread()
                error_msg = f"Anthropic API 请求失败: {resp.status_code}"
                try:
                    err_data = json.loads(error_body)
                    error_msg = err_data.get("error", {}).get("message", error_msg)
                except Exception:
                    error_msg += f" {error_body.decode()[:200]}"
                yield f"data: {json.dumps({'error': {'message': error_msg}})}\n\n"
                yield "data: [DONE]\n\n"
                return

            current_event = ""
            async for raw_line in resp.aiter_lines():
                if raw_line.startswith("event: "):
                    current_event = raw_line[7:]
                    continue
                if not raw_line.startswith("data: "):
                    continue
                data = raw_line[6:]

                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue

                # 转发原生 thinking 内容（如 Anthropic extended thinking）
                if current_event == "content_block_start":
                    block_type = chunk.get("content_block", {}).get("type")
                    if block_type == "thinking":
                        has_thinking_block = True
                        yield f"data: {json.dumps({'type': 'thinking_start'}, ensure_ascii=False)}\n\n"

                elif current_event == "content_block_delta":
                    delta = chunk.get("delta", {})
                    if delta.get("type") == "thinking_delta":
                        yield f"data: {json.dumps({'type': 'thinking', 'content': delta.get('thinking', '')}, ensure_ascii=False)}\n\n"
                    elif delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        if text:
                            accumulated_text += text

                            # 思考模式：解析 <thinking> 标签
                            if request.thinking_mode and not has_thinking_block:
                                # 检测 <thinking> 开始标签
                                if not in_thinking_tag:
                                    open_idx = accumulated_text.find("<thinking>")
                                    if open_idx >= 0:
                                        in_thinking_tag = True
                                        thinking_tag_sent = open_idx + len("<thinking>")

                                if in_thinking_tag:
                                    # 在标签内：等待 </thinking> 关闭标签
                                    close_idx = accumulated_text.find("</thinking>", thinking_tag_sent)
                                    if close_idx >= 0:
                                        # 找到关闭标签：发送标签内的思考内容
                                        thinking_content = accumulated_text[thinking_tag_sent:close_idx]
                                        if thinking_content:
                                            yield f"data: {json.dumps({'type': 'thinking', 'content': thinking_content}, ensure_ascii=False)}\n\n"
                                        # 关闭标签后的内容作为回复
                                        in_thinking_tag = False
                                        after_content = accumulated_text[close_idx + len("</thinking>"):]
                                        if after_content:
                                            yield f"data: {json.dumps({'choices': [{'delta': {'content': after_content}}]}, ensure_ascii=False)}\n\n"
                                        thinking_tag_sent = len(accumulated_text)
                                    else:
                                        # 标签未关闭：发送新增的思考内容
                                        new_thinking = accumulated_text[thinking_tag_sent:]
                                        if new_thinking:
                                            yield f"data: {json.dumps({'type': 'thinking', 'content': new_thinking}, ensure_ascii=False)}\n\n"
                                            thinking_tag_sent = len(accumulated_text)
                                else:
                                    # 不在标签内：发送回复内容（跳过 <thinking> 标签部分）
                                    open_idx = accumulated_text.find("<thinking>")
                                    if open_idx >= 0:
                                        response_part = accumulated_text[:open_idx]
                                    else:
                                        response_part = accumulated_text
                                    if response_part:
                                        yield f"data: {json.dumps({'choices': [{'delta': {'content': response_part}}]}, ensure_ascii=False)}\n\n"
                                        accumulated_text = accumulated_text[len(response_part):]
                            else:
                                # 非思考模式或有原生 thinking block：直接转发
                                yield f"data: {json.dumps({'choices': [{'delta': {'content': text}}]}, ensure_ascii=False)}\n\n"

                elif current_event == "content_block_stop":
                    yield f"data: {json.dumps({'type': 'thinking_stop'}, ensure_ascii=False)}\n\n"

                elif current_event == "message_stop":
                    break

    yield "data: [DONE]\n\n"
