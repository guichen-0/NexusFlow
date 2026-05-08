from typing import Dict, Any
import asyncio
import time

class Executor:
    """任务执行器：执行单个节点"""

    def __init__(self, ai_service, model_router):
        self.ai_service = ai_service
        self.model_router = model_router

    async def execute_node(self, node: Dict, context: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个节点"""
        node_type = node.get("type", "default")
        node_id = node["id"]
        label = node.get("label", node_id)

        # 模拟执行延迟
        await asyncio.sleep(0.5)

        # 路由到合适的模型
        model_config = self.model_router.route(node_type)

        # 构建提示词
        prompt = self._build_prompt(node, context)

        # 调用 AI 服务
        try:
            response = await self.ai_service.chat(
                messages=[{"role": "user", "content": prompt}],
                model=model_config["model"]
            )

            return {
                "node_id": node_id,
                "status": "completed",
                "output": response.get("content", "执行完成"),
                "model": model_config["model"],
                "tokens": response.get("usage", {})
            }
        except Exception as e:
            return {
                "node_id": node_id,
                "status": "failed",
                "error": str(e)
            }

    def _build_prompt(self, node: Dict, context: Dict[str, Any]) -> str:
        """构建提示词"""
        node_type = node.get("type", "")
        label = node.get("label", "")

        # 根据节点类型生成不同的提示词
        prompts = {
            "analyze": f"请分析以下需求：\n{node.get('input', '')}\n\n请提供：1. 功能需求列表 2. 技术选型建议 3. 数据库设计建议",
            "generate": f"请根据以下分析生成代码：\n{context.get('analyze', '')}\n\n请生成完整可运行的代码。",
            "review": f"请审查以下代码：\n{context.get('generate', '')}\n\n请检查：1. 语法错误 2. 安全漏洞 3. 代码规范问题",
            "fix": f"请根据审查意见修复代码：\n代码：{context.get('generate', '')}\n问题：{context.get('review', '')}\n\n请修复并输出完整代码。",
            "report": f"请生成项目报告，包含：\n需求分析：{context.get('analyze', '')}\n代码：{context.get('generate', '')}\n审查：{context.get('review', '')}",
            "default": f"请完成以下任务：{label}\n输入：{context.get('previous', '')}"
        }

        return prompts.get(node_type, prompts["default"])
