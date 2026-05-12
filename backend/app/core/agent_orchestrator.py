"""
Agent 编排引擎 — 5 Agent 智能流水线

核心逻辑：
1. 任务分类 → 决定走哪几个 Agent（不是所有任务都跑全流程）
2. 每个 Agent 的输出形式由任务类型决定（代码任务→代码，分析任务→文档）
3. 上下游之间只传递结构化必要信息
"""
import json
import re
from typing import Dict, List, Any, AsyncGenerator, Optional
from dataclasses import dataclass

from app.services.ai_service import AIService


@dataclass
class AgentDefinition:
    id: str
    name: str
    role: str
    system_prompt: str
    output_key: str = ""


# ========== 5 个 Agent ==========

AGENT_DEFS: Dict[str, AgentDefinition] = {
    "analyze": AgentDefinition(
        id="analyze",
        name="需求分析",
        role="分析",
        system_prompt="""\
你是需求分析师。分析用户需求，输出结构化的任务规格。

任务类型分类（必须选一个）：
- code: 需要写代码
- doc: 需要写文档/报告
- translate: 需要翻译
- qa: 只是问答/咨询

输出格式：
TYPE: <code/doc/translate/qa>
GOAL: <一句话目标>
STEPS: <需要哪些Agent步骤，从[analyze,generate,review,fix,report]中选>
REQS: <具体需求点，用编号列出>

注意：STEPS 决定了后续哪些 Agent 会被执行，选错了会影响结果质量。""",
        output_key="analysis",
    ),
    "generate": AgentDefinition(
        id="generate",
        name="代码生成",
        role="开发",
        system_prompt="""\
你是高级开发工程师。根据任务规格生成代码。

规则：
- 直接输出代码，代码前不要写任何文字
- 代码必须完整可运行，不要用省略号或"其余类似"
- 只在复杂逻辑处添加简短注释
- 不输出package.json等配置，除非任务明确要求
- 如果是Web项目，优先单文件可运行方案""",
        output_key="code",
    ),
    "review": AgentDefinition(
        id="review",
        name="代码审查",
        role="审查",
        system_prompt="""\
你是代码审查专家。只检查会导致程序出错或产生安全漏洞的问题。

必须报告：
- 会导致运行时报错的Bug
- 安全漏洞（注入、XSS、硬编码密钥）
- 会导致数据丢失或损坏的逻辑错误

不要报告：
- 代码风格、命名规范
- "建议优化"类的性能问题
- 可读性、可维护性建议

输出格式：
如果有问题：逐条列出，格式为 BUG/SECURITY: <位置> <问题> <修复>
如果没有问题：OK""",
        output_key="review",
    ),
    "fix": AgentDefinition(
        id="fix",
        name="自动修复",
        role="修复",
        system_prompt="""\
你是代码修复专家。

规则：
1. 审查结果为 OK → 输出 FIX: NONE
2. 有具体问题 → 只修复审查中列出的问题
3. 输出修复后的完整代码
4. 不解释改了什么""",
        output_key="fixed_code",
    ),
    "report": AgentDefinition(
        id="report",
        name="报告生成",
        role="报告",
        system_prompt="""\
你是技术文档专家。生成简洁的项目报告。

输出格式：
项目: <名称>
技术栈: <列表>
文件: <核心文件列表>
运行: <启动命令>
说明: <2-3句话描述核心逻辑>""",
        output_key="report",
    ),
}

# 全流程 Agent 顺序
FULL_PIPELINE = ["analyze", "generate", "review", "fix", "report"]


def _determine_pipeline(analysis: str) -> List[str]:
    """根据分析结果决定执行哪些 Agent"""
    steps = []

    # 从分析结果中提取 STEPS 字段
    for line in analysis.split("\n"):
        if line.upper().startswith("STEPS:"):
            step_str = line.split(":", 1)[1].strip()
            for s in ["analyze", "generate", "review", "fix", "report"]:
                if s in step_str.lower():
                    steps.append(s)
            break

    # 兜底：如果没有提取到，用默认流程
    if not steps:
        steps = FULL_PIPELINE

    # analyze 总是第一个（已经被执行了）
    if "analyze" not in steps:
        steps.insert(0, "analyze")

    return steps


def _build_agent_messages(
    agent_id: str,
    user_task: str,
    context: Dict[str, str],
    skill_prompt: Optional[str] = None,
) -> List[Dict[str, str]]:
    agent = AGENT_DEFS[agent_id]
    # 如果有 Skill prompt，追加到 agent 的 system_prompt 后面
    system_content = agent.system_prompt
    if skill_prompt:
        system_content = f"{agent.system_prompt}\n\n---\n\n## Skill 约束\n\n{skill_prompt}"
    messages = [{"role": "system", "content": system_content}]

    if agent_id == "analyze":
        # 分析 Agent：只需要用户原始输入
        messages.append({"role": "user", "content": user_task})

    elif agent_id == "generate":
        # 生成 Agent：只需要结构化需求
        analysis = context.get("analysis", "")
        messages.append({"role": "user", "content": f"任务规格：\n{analysis}\n\n请生成代码。"})

    elif agent_id == "review":
        # 审查 Agent：只需要代码
        code = context.get("code", "")
        messages.append({"role": "user", "content": f"请审查以下代码：\n\n{code}"})

    elif agent_id == "fix":
        # 修复 Agent：代码 + 审查意见
        code = context.get("code", "")
        review = context.get("review", "")
        messages.append({"role": "user", "content": f"代码：\n{code}\n\n审查意见：\n{review}"})

    elif agent_id == "report":
        # 报告 Agent：所有关键信息的摘要
        parts = []
        analysis = context.get("analysis", "")
        code = context.get("code", "")
        review = context.get("review", "")
        fixed = context.get("fixed_code", "")

        if analysis:
            # 只取 TYPE/GOAL/REQS 行
            for line in analysis.split("\n"):
                l = line.strip()
                if l.upper().startswith(("TYPE:", "GOAL:", "REQS:")):
                    parts.append(l)
        if code:
            parts.append(f"代码长度: {len(code)} 字符")
            # 提取文件名或类名作为结构信息
            filenames = re.findall(r'(?:file|文件)[：:]\s*(\S+\.\w+)', code, re.IGNORECASE)
            classes = re.findall(r'(?:class|def|function|const|let|var)\s+(\w+)', code)
            if filenames:
                parts.append(f"文件: {', '.join(filenames[:10])}")
            if classes:
                parts.append(f"主要模块: {', '.join(classes[:10])}")
        if review and review.strip() != "OK":
            parts.append(f"审查发现: {review[:500]}")
        if fixed and fixed != "FIX: NONE":
            parts.append(f"已修复: 是")

        messages.append({"role": "user", "content": "\n".join(parts) + "\n\n请生成项目报告。"})

    else:
        messages.append({"role": "user", "content": f"任务：{user_task}"})

    return messages


async def run_agent_pipeline(
    user_task: str,
    api_key: str,
    api_base_url: str,
    api_format: str = "openai",
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    执行 Agent 流水线 — 智能版本

    流程：
    1. 分析 Agent 判断任务类型，决定后续执行哪些 Agent
    2. 后续 Agent 只处理被选中的步骤
    3. 每个 Agent 只收到自己需要的上下文
    """
    ai_service = AIService(
        use_mock=False,
        api_key=api_key,
        base_url=api_base_url,
        api_format=api_format,
    )

    context: Dict[str, str] = {}
    pipeline_results: Dict[str, Any] = {}
    total_tokens = {"prompt": 0, "completion": 0, "total": 0}

    # 第一步：执行分析 Agent
    yield _sse_event({
        "type": "agent_start",
        "agent_id": "analyze",
        "agent_name": "需求分析",
        "role": "分析",
    })

    messages = _build_agent_messages("analyze", user_task, context, system_prompt)
    try:
        response = await ai_service.chat(messages=messages, model=model)
        output = response.get("content", "")
        usage = response.get("usage", {})
        _accumulate_tokens(total_tokens, usage)
        context["analysis"] = output

        yield _sse_event({
            "type": "agent_complete",
            "agent_id": "analyze",
            "agent_name": "需求分析",
            "output": output,
            "tokens": _usage_dict(usage),
        })
        pipeline_results["analyze"] = {
            "name": "需求分析", "role": "分析",
            "output": output, "tokens": _usage_dict(usage), "status": "completed",
        }
    except Exception as e:
        yield _sse_event({"type": "agent_error", "agent_id": "analyze", "agent_name": "需求分析", "error": str(e)})
        pipeline_results["analyze"] = {"name": "需求分析", "role": "分析", "output": "", "status": "failed", "error": str(e)}
        yield _sse_event({"type": "pipeline_complete", "results": pipeline_results, "total_tokens": total_tokens})
        return

    # 根据分析结果决定后续流程
    remaining_steps = _determine_pipeline(output)
    remaining_steps = [s for s in remaining_steps if s != "analyze"]

    yield _sse_event({
        "type": "pipeline_plan",
        "steps": remaining_steps,
        "message": f"计划执行: {', '.join(remaining_steps)}",
    })

    # 逐个执行后续 Agent
    for agent_id in remaining_steps:
        agent = AGENT_DEFS[agent_id]

        yield _sse_event({
            "type": "agent_start",
            "agent_id": agent.id,
            "agent_name": agent.name,
            "role": agent.role,
        })

        messages = _build_agent_messages(agent_id, user_task, context, system_prompt)
        try:
            response = await ai_service.chat(messages=messages, model=model)
            output = response.get("content", "")
            usage = response.get("usage", {})
            _accumulate_tokens(total_tokens, usage)
            context[agent.output_key] = output

            yield _sse_event({
                "type": "agent_complete",
                "agent_id": agent.id,
                "agent_name": agent.name,
                "output": output,
                "tokens": _usage_dict(usage),
            })

            pipeline_results[agent.id] = {
                "name": agent.name, "role": agent.role,
                "output": output, "tokens": _usage_dict(usage), "status": "completed",
            }

        except Exception as e:
            yield _sse_event({"type": "agent_error", "agent_id": agent.id, "agent_name": agent.name, "error": str(e)})
            pipeline_results[agent.id] = {
                "name": agent.name, "role": agent.role,
                "output": "", "status": "failed", "error": str(e),
            }

    yield _sse_event({
        "type": "pipeline_complete",
        "results": pipeline_results,
        "total_tokens": total_tokens,
    })


def _accumulate_tokens(total: Dict, usage: Dict):
    total["prompt"] += usage.get("prompt_tokens", 0)
    total["completion"] += usage.get("completion_tokens", 0)
    total["total"] += usage.get("total_tokens", 0)


def _usage_dict(usage: Dict) -> Dict:
    return {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
