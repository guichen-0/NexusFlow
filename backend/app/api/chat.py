"""Chat API — AI 聊天 + 自动代码执行"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import json
import re
import asyncio

from app.core.sandbox import sandbox

router = APIRouter()


class ChatRequest(BaseModel):
    messages: List[dict]
    model: str = "deepseek-v3"
    stream: bool = True
    api_key: str = ""
    api_base_url: str = ""
    auto_execute: bool = True  # 是否自动执行代码块


# 代码块正则：匹配 ```language\ncode\n```
CODE_BLOCK_PATTERN = re.compile(r'```(\w+)?\n(.*?)\n```', re.DOTALL)

# 语言映射
LANG_MAP = {
    "python": "python",
    "py": "python",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
}


async def execute_code_block(code: str, language: str) -> dict:
    """执行代码块并返回结果"""
    lang = LANG_MAP.get(language.lower(), "python")
    result = await sandbox.execute(code, lang)
    return {
        "language": lang,
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": result.duration_ms,
        "success": result.exit_code == 0,
        "timed_out": result.timed_out,
    }


def extract_and_execute_code_blocks(content: str) -> tuple:
    """
    从 AI 响应中提取代码块并执行
    返回 (augmented_content, execution_results)
    augmented_content 中代码块后面追加执行结果
    """
    executions = []
    results = []

    def replace_with_result(match):
        lang = match.group(1) or "python"
        code = match.group(2)

        # 只执行支持的语言
        if lang.lower() not in LANG_MAP:
            return match.group(0)

        executions.append((code, lang))
        idx = len(executions) - 1
        exec_ref = f"<!-- exec-ref:{idx} -->"
        results.append(exec_ref)
        return match.group(0) + f"\n{exec_ref}\n"

    augmented = CODE_BLOCK_PATTERN.sub(replace_with_result, content)

    # 执行所有代码块
    exec_outputs = []
    for code, lang in executions:
        try:
            output = asyncio.get_event_loop().run_until_complete(
                execute_code_block(code, lang)
            )
        except RuntimeError:
            # 不在事件循环中，创建新的
            output = asyncio.run(execute_code_block(code, lang))
        exec_outputs.append(output)

    # 替换占位符为实际结果
    for ref, output in zip(results, exec_outputs):
        if output["success"] and output["stdout"]:
            result_text = f"**Output** (`{output['duration_ms']}ms`):\n```\n{output['stdout']}\n```"
        elif output["stderr"]:
            result_text = f"**Error**:\n```\n{output['stderr']}\n```"
        elif output["timed_out"]:
            result_text = "**Execution timed out**"
        else:
            result_text = f"*(No output, exit code: {output['exit_code']})*"

        augmented = augmented.replace(ref, result_text, 1)

    return augmented, exec_outputs


@router.post("/chat")
async def chat(request: ChatRequest):
    """统一 AI 聊天接口，支持流式和非流式"""
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API Key is required")

    base_url = request.api_base_url.rstrip('/') if request.api_base_url else "https://api.openai.com/v1"
    url = f"{base_url}/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {request.api_key}",
    }

    payload = {
        "model": request.model,
        "messages": request.messages,
        "stream": request.stream,
    }

    if request.stream:
        return StreamingResponse(
            stream_chat_with_exec(url, headers, payload, request.auto_execute),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            data = resp.json()
            content = data["choices"][0]["message"]["content"] if data.get("choices") else ""

            # 自动执行代码块
            if request.auto_execute and content:
                augmented, exec_results = await async_extract_and_execute(content)
                data["choices"][0]["message"]["content"] = augmented
                data["executions"] = exec_results

            return data


async def async_extract_and_execute(content: str) -> tuple:
    """异步版本的代码块提取和执行"""
    executions = []
    results = []

    def replace_with_result(match):
        lang = match.group(1) or "python"
        code = match.group(2)
        if lang.lower() not in LANG_MAP:
            return match.group(0)
        executions.append((code, lang))
        idx = len(executions) - 1
        results.append(f"<!-- exec-ref:{idx} -->")
        return match.group(0) + f"\n{results[-1]}\n"

    augmented = CODE_BLOCK_PATTERN.sub(replace_with_result, content)

    # 并发执行所有代码块
    exec_outputs = []
    for code, lang in executions:
        output = await execute_code_block(code, lang)
        exec_outputs.append(output)

    for ref, output in zip(results, exec_outputs):
        if output["success"] and output["stdout"]:
            result_text = f"**Output** (`{output['duration_ms']}ms`):\n```\n{output['stdout']}\n```"
        elif output["stderr"]:
            result_text = f"**Error**:\n```\n{output['stderr']}\n```"
        elif output["timed_out"]:
            result_text = "**Execution timed out**"
        else:
            result_text = f"*(No output, exit code: {output['exit_code']})*"
        augmented = augmented.replace(ref, result_text, 1)

    return augmented, exec_outputs


async def stream_chat_with_exec(url: str, headers: dict, payload: dict, auto_execute: bool):
    """SSE 流式转发 + 流式结束后自动执行代码块"""
    full_content = ""

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as resp:
            if resp.status_code != 200:
                error_body = await resp.aread()
                yield f"data: {json.dumps({'error': {'message': error_body.decode(), 'status': resp.status_code}})}\n\n"
                yield "data: [DONE]\n\n"
                return

            async for line in resp.aiter_lines():
                if line:
                    yield f"{line}\n\n"
                    # 收集完整内容
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            delta = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                full_content += delta
                        except (json.JSONDecodeError, IndexError, KeyError):
                            pass

    # 流式结束后，自动执行代码块
    if auto_execute and full_content and CODE_BLOCK_PATTERN.search(full_content):
        _, exec_results = await async_extract_and_execute(full_content)
        if exec_results:
            # 将执行结果作为额外 SSE 事件发送
            yield f"data: {json.dumps({'type': 'executions', 'results': exec_results})}\n\n"
