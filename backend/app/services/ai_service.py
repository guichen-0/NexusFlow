"""
AI 服务封装：支持 Mock 模式和真实 API，带 Tool Calling 支持
"""
import os
import json
import asyncio
import httpx
from typing import Dict, List, Any, Optional


# ========== Tool 定义 ==========
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_code",
            "description": "执行代码（Python、JavaScript、TypeScript）。用于运行代码、测试代码片段、验证算法等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "要执行的代码"
                    },
                    "language": {
                        "type": "string",
                        "enum": ["python", "javascript", "typescript"],
                        "description": "代码语言"
                    },
                    "workspace_id": {
                        "type": "string",
                        "description": "工作空间 ID（可选，用于文件操作）"
                    }
                },
                "required": ["code", "language"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "读取工作空间中的文件内容。用于查看文件、检查代码、读取配置等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "工作空间 ID"
                    },
                    "path": {
                        "type": "string",
                        "description": "文件路径（相对于工作空间根目录）"
                    }
                },
                "required": ["workspace_id", "path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "向工作空间写入文件。用于创建新文件、修改代码、保存配置等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "工作空间 ID"
                    },
                    "path": {
                        "type": "string",
                        "description": "文件路径（相对于工作空间根目录）"
                    },
                    "content": {
                        "type": "string",
                        "description": "文件内容"
                    }
                },
                "required": ["workspace_id", "path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "列出工作空间中的文件和目录。用于查看项目结构、查找文件等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "工作空间 ID"
                    },
                    "path": {
                        "type": "string",
                        "description": "目录路径（可选，默认为根目录）"
                    }
                },
                "required": ["workspace_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "execute_terminal",
            "description": "执行终端命令（需要终端权限）。用于运行系统命令、安装依赖、查看环境变量等。",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "要执行的终端命令"
                    },
                    "workspace_id": {
                        "type": "string",
                        "description": "工作空间 ID（可选，作为工作目录）"
                    }
                },
                "required": ["command"]
            }
        }
    }
]


class AIService:
    """AI 服务封装：支持 Mock 模式和真实 API，带 Tool Calling"""

    def __init__(self, use_mock: bool = True, api_key: Optional[str] = None, base_url: Optional[str] = None, api_format: str = "openai"):
        self.use_mock = use_mock
        self.api_key = api_key
        self.base_url = base_url
        self.api_format = api_format  # "openai" 或 "anthropic"
        self.sandbox_url = "http://localhost:8000/api/v1/sandbox"  # 沙箱 API 地址

    async def chat(self, messages: List[Dict], model: Optional[str] = None, workspace_id: Optional[str] = None) -> Dict[str, Any]:
        """
        AI 聊天接口（带 Tool Calling）
        - workspace_id: 当前会话的工作空间 ID（用于工具执行）
        """
        if self.use_mock or not self.api_key or self.api_key == "mock":
            return await self._mock_response(messages)
        if self.api_format == "anthropic":
            return await self._anthropic_request(messages, model, workspace_id)
        return await self._real_request(messages, model, workspace_id)

    async def _mock_response(self, messages: List[Dict]) -> Dict[str, Any]:
        """模拟 AI 响应"""
        last_message = ""
        for msg in messages:
            if msg.get("role") == "user":
                last_message = msg.get("content", "")

        await asyncio.sleep(0.3)

        return {
            "content": f"[Mock] 已收到你的消息：{last_message[:50]}...",
            "model": "mock-model",
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 200,
                "total_tokens": 300
            }
        }

    async def _execute_tool(self, tool_name: str, tool_args: Dict, workspace_id: Optional[str]) -> Dict:
        """
        执行工具调用
        返回工具执行结果
        """
        try:
            if tool_name == "execute_code":
                return await self._tool_execute_code(tool_args, workspace_id)
            elif tool_name == "read_file":
                return await self._tool_read_file(tool_args, workspace_id)
            elif tool_name == "write_file":
                return await self._tool_write_file(tool_args, workspace_id)
            elif tool_name == "list_files":
                return await self._tool_list_files(tool_args, workspace_id)
            elif tool_name == "execute_terminal":
                return await self._tool_execute_terminal(tool_args, workspace_id)
            else:
                return {"error": f"未知工具: {tool_name}"}
        except Exception as e:
            return {"error": str(e)}

    async def _tool_execute_code(self, args: Dict, workspace_id: Optional[str]) -> Dict:
        """执行代码"""
        code = args.get("code", "")
        language = args.get("language", "python")
        ws_id = args.get("workspace_id") or workspace_id

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.sandbox_url}/execute",
                json={"code": code, "language": language, "workspace_id": ws_id}
            )
            if resp.status_code != 200:
                return {"error": f"代码执行失败: {resp.text}"}
            return resp.json()

    async def _tool_read_file(self, args: Dict, workspace_id: Optional[str]) -> Dict:
        """读取文件"""
        ws_id = args.get("workspace_id") or workspace_id
        path = args.get("path", "")

        if not ws_id:
            return {"error": "未指定工作空间 ID"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.sandbox_url}/workspace/file/read",
                json={"workspace_id": ws_id, "path": path}
            )
            if resp.status_code != 200:
                return {"error": f"读取文件失败: {resp.text}"}
            return resp.json()

    async def _tool_write_file(self, args: Dict, workspace_id: Optional[str]) -> Dict:
        """写入文件"""
        ws_id = args.get("workspace_id") or workspace_id
        path = args.get("path", "")
        content = args.get("content", "")

        if not ws_id:
            return {"error": "未指定工作空间 ID"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.sandbox_url}/workspace/file/write",
                json={"workspace_id": ws_id, "path": path, "content": content}
            )
            if resp.status_code != 200:
                return {"error": f"写入文件失败: {resp.text}"}
            return resp.json()

    async def _tool_list_files(self, args: Dict, workspace_id: Optional[str]) -> Dict:
        """列出文件"""
        ws_id = args.get("workspace_id") or workspace_id
        path = args.get("path", "")

        if not ws_id:
            return {"error": "未指定工作空间 ID"}

        # 调用沙箱 API 的 browse 端点
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.sandbox_url}/browse",
                params={"workspace_id": ws_id, "path": path}
            )
            if resp.status_code != 200:
                return {"error": f"列出文件失败: {resp.text}"}
            return resp.json()

    async def _tool_execute_terminal(self, args: Dict, workspace_id: Optional[str]) -> Dict:
        """执行终端命令"""
        command = args.get("command", "")
        ws_id = args.get("workspace_id") or workspace_id

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.sandbox_url}/terminal",
                json={"command": command, "workspace_id": ws_id}
            )
            if resp.status_code != 200:
                return {"error": f"终端命令执行失败: {resp.text}"}
            return resp.json()

    async def _real_request(self, messages: List[Dict], model: Optional[str], workspace_id: Optional[str]) -> Dict[str, Any]:
        """
        真实 AI API 请求（支持 Tool Calling）
        使用 OpenAI 兼容 API
        """
        base_url = self.base_url.rstrip('/') if self.base_url else "https://api.openai.com/v1"
        url = f"{base_url}/chat/completions"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        # 第一轮请求：带 tools
        payload = {
            "model": model or "deepseek-v3",
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",  # 让 AI 自行决定是否调用工具
        }

        tool_results = []
        current_messages = messages.copy()

        async with httpx.AsyncClient(timeout=120.0) as client:
            # 第一轮：发送带 tools 的请求
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"AI API 请求失败: {resp.status_code} {resp.text}")

            data = resp.json()
            choice = data["choices"][0]
            message = choice["message"]

            # 检查是否有 tool_calls
            if "tool_calls" in message and message["tool_calls"]:
                # AI 请求调用工具
                tool_calls = message["tool_calls"]

                # 添加 AI 的响应消息（包含 tool_calls）
                assistant_msg = {
                    "role": "assistant",
                    "content": message.get("content"),
                    "tool_calls": tool_calls
                }
                # DeepSeek 推理模型需要在后续请求中传回 reasoning_content
                # 即使值为空/None 也必须带上这个字段，否则 DeepSeek 报 400
                if "reasoning_content" in message:
                    assistant_msg["reasoning_content"] = message.get("reasoning_content") or ""
                current_messages.append(assistant_msg)

                # 执行所有工具调用
                for tool_call in tool_calls:
                    function_name = tool_call["function"]["name"]
                    function_args = json.loads(tool_call["function"]["arguments"])

                    # 执行工具
                    result = await self._execute_tool(function_name, function_args, workspace_id)

                    # 添加工具执行结果
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(result, ensure_ascii=False)
                    })

                    tool_results.append({
                        "tool": function_name,
                        "result": result
                    })

                # 第二轮请求：将工具结果发回给 AI
                payload2 = {
                    "model": model or "deepseek-v3",
                    "messages": current_messages,
                    "tools": TOOLS,
                    "tool_choice": "auto"
                }

                resp2 = await client.post(url, headers=headers, json=payload2)
                if resp2.status_code != 200:
                    raise Exception(f"AI API 第二轮请求失败: {resp2.status_code} {resp2.text}")

                data2 = resp2.json()
                choice2 = data2["choices"][0]
                final_message = choice2["message"]

                # 检查是否还有 tool_calls（多轮工具调用）
                if "tool_calls" in final_message and final_message["tool_calls"]:
                    # 继续处理（多轮）
                    return await self._handle_multi_round_tool_calls(client, url, headers, model, current_messages, final_message, workspace_id, tool_results)

                # 返回最终结果
                return {
                    "content": final_message.get("content", ""),
                    "model": data2.get("model", model),
                    "usage": data2.get("usage", {}),
                    "tool_calls": [{"function": {"name": tc["function"]["name"], "arguments": tc["function"]["arguments"]}} for tc in tool_calls],
                    "tool_results": tool_results
                }
            else:
                # AI 没有调用工具，直接返回响应
                return {
                    "content": message.get("content", ""),
                    "model": data.get("model", model),
                    "usage": data.get("usage", {})
                }

    async def _handle_multi_round_tool_calls(self, client, url, headers, model, messages, last_message, workspace_id, tool_results):
        """
        处理多轮 tool_calls（递归处理，最多 5 轮）
        """
        max_rounds = 5  # 最多允许 5 轮工具调用
        current_messages = messages.copy()
        current_tool_results = tool_results.copy()

        for round_num in range(max_rounds):
            if "tool_calls" not in last_message or not last_message["tool_calls"]:
                break

            tool_calls = last_message["tool_calls"]

            # 添加 AI 的响应消息
            assistant_msg = {
                "role": "assistant",
                "content": last_message.get("content"),
                "tool_calls": tool_calls
            }
            # DeepSeek 推理模型需要在后续请求中传回 reasoning_content
            # 即使值为空/None 也必须带上这个字段，否则 DeepSeek 报 400
            if "reasoning_content" in last_message:
                assistant_msg["reasoning_content"] = last_message.get("reasoning_content") or ""
            current_messages.append(assistant_msg)

            # 执行工具调用
            for tool_call in tool_calls:
                function_name = tool_call["function"]["name"]
                function_args = json.loads(tool_call["function"]["arguments"])

                result = await self._execute_tool(function_name, function_args, workspace_id)

                current_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps(result, ensure_ascii=False)
                })

                current_tool_results.append({
                    "tool": function_name,
                    "result": result
                })

            # 发送下一轮请求
            payload = {
                "model": model or "deepseek-v3",
                "messages": current_messages,
                "tools": TOOLS,
                "tool_choice": "auto"
            }

            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"AI API 第 {round_num + 2} 轮请求失败: {resp.status_code} {resp.text}")

            data = resp.json()
            last_message = data["choices"][0]["message"]

        # 返回最终结果
        return {
            "content": last_message.get("content", ""),
            "model": data.get("model", model),
            "usage": data.get("usage", {}),
            "tool_calls": [],
            "tool_results": current_tool_results
        }

    async def _anthropic_request(self, messages: List[Dict], model: Optional[str], workspace_id: Optional[str]) -> Dict[str, Any]:
        """
        Anthropic API 请求（支持 Tool Calling）
        使用 Anthropic Messages API 格式
        """
        base_url = self.base_url.rstrip('/') if self.base_url else "https://api.anthropic.com"
        url = f"{base_url}/v1/messages"

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }

        # 转换消息格式：Anthropic 要求 system 消息单独提取
        system_message = ""
        anthropic_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_message = msg.get("content", "")
            else:
                anthropic_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        # 转换工具格式：OpenAI -> Anthropic
        anthropic_tools = []
        for tool in TOOLS:
            anthropic_tools.append({
                "name": tool["function"]["name"],
                "description": tool["function"]["description"],
                "input_schema": tool["function"]["parameters"]
            })

        # 构建请求体 — Anthropic 格式暂不发送 tools（MiMo 不支持）
        payload = {
            "model": model or "mimo-v2.5",
            "messages": anthropic_messages,
            "max_tokens": 4096,
        }
        if system_message:
            payload["system"] = system_message

        async with httpx.AsyncClient(timeout=120.0) as client:
            # 第一轮请求
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"Anthropic API 请求失败: {resp.status_code} {resp.text}")

            data = resp.json()

            # 提取文本内容（跳过 thinking/tool_use 等非文本块）
            content = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    content += block.get("text", "")

                return {
                    "content": content,
                    "model": data.get("model", model),
                    "usage": data.get("usage", {})
                }
