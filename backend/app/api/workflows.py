from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import asyncio

router = APIRouter()

# 数据模型
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
    created_at: str = "2026-05-08T00:00:00"

# 模拟数据库
workflows_db = {}

# 内置 8 个工作流模板
DEFAULT_WORKFLOWS = [
    {
        "id": "code-factory",
        "name": "自动代码工厂",
        "description": "输入需求描述，自动生成可运行项目",
        "category": "developer",
        "nodes": [
            {"id": "analyze", "type": "analyze", "label": "需求分析", "depends_on": []},
            {"id": "generate", "type": "generate", "label": "代码生成", "depends_on": ["analyze"]},
            {"id": "review", "type": "review", "label": "代码审查", "depends_on": ["generate"]},
            {"id": "fix", "type": "fix", "label": "自动修复", "depends_on": ["review"]},
            {"id": "report", "type": "report", "label": "输出报告", "depends_on": ["fix"]}
        ]
    },
    {
        "id": "content-pipeline",
        "name": "内容创作流水线",
        "description": "输入主题，输出完整文章+配图",
        "category": "content",
        "nodes": [
            {"id": "topic", "type": "topic", "label": "选题", "depends_on": []},
            {"id": "outline", "type": "outline", "label": "大纲", "depends_on": ["topic"]},
            {"id": "write", "type": "write", "label": "撰写", "depends_on": ["outline"]},
            {"id": "illustrate", "type": "illustrate", "label": "配图", "depends_on": ["write"]},
            {"id": "format", "type": "format", "label": "排版", "depends_on": ["illustrate"]}
        ]
    },
    {
        "id": "batch-processor",
        "name": "批量任务处理器",
        "description": "输入模板+数据源，批量生成内容",
        "category": "data",
        "nodes": [
            {"id": "parse", "type": "parse", "label": "数据解析", "depends_on": []},
            {"id": "process", "type": "process", "label": "逐条处理", "depends_on": ["parse"]},
            {"id": "check", "type": "check", "label": "质量检查", "depends_on": ["process"]},
            {"id": "summary", "type": "summary", "label": "结果汇总", "depends_on": ["check"]}
        ]
    },
    {
        "id": "train-data-gen",
        "name": "AI 训练数据生成",
        "description": "生成高质量的 AI 训练数据集",
        "category": "data",
        "nodes": [
            {"id": "schema", "type": "schema", "label": "数据结构设计", "depends_on": []},
            {"id": "generate", "type": "generate", "label": "样本生成", "depends_on": ["schema"]},
            {"id": "validate", "type": "validate", "label": "质量验证", "depends_on": ["generate"]},
            {"id": "augment", "type": "augment", "label": "数据增强", "depends_on": ["validate"]},
            {"id": "export", "type": "export", "label": "导出数据集", "depends_on": ["augment"]},
            {"id": "verify", "type": "verify", "label": "最终校验", "depends_on": ["export"]}
        ]
    },
    {
        "id": "translation-pipeline",
        "name": "多语言文档翻译管线",
        "description": "批量翻译文档并保持格式",
        "category": "content",
        "nodes": [
            {"id": "detect", "type": "detect", "label": "语言检测", "depends_on": []},
            {"id": "translate", "type": "translate", "label": "翻译", "depends_on": ["detect"]},
            {"id": "review", "type": "review", "label": "人工审核", "depends_on": ["translate"]},
            {"id": "publish", "type": "publish", "label": "发布", "depends_on": ["review"]}
        ]
    },
    {
        "id": "code-review",
        "name": "代码 Review 自动化",
        "description": "自动审查代码并生成改进建议",
        "category": "developer",
        "nodes": [
            {"id": "scan", "type": "scan", "label": "代码扫描", "depends_on": []},
            {"id": "analyze", "type": "analyze", "label": "问题分析", "depends_on": ["scan"]},
            {"id": "suggest", "type": "suggest", "label": "改进建议", "depends_on": ["analyze"]},
            {"id": "test", "type": "test", "label": "测试验证", "depends_on": ["suggest"]},
            {"id": "report", "type": "report", "label": "审查报告", "depends_on": ["test"]}
        ]
    },
    {
        "id": "testcase-gen",
        "name": "AI 驱动的测试用例生成",
        "description": "根据代码自动生成测试用例",
        "category": "developer",
        "nodes": [
            {"id": "analyze", "type": "analyze", "label": "代码分析", "depends_on": []},
            {"id": "gen-case", "type": "gen-case", "label": "生成用例", "depends_on": ["analyze"]},
            {"id": "gen-data", "type": "gen-data", "label": "测试数据", "depends_on": ["gen-case"]},
            {"id": "execute", "type": "execute", "label": "执行测试", "depends_on": ["gen-data"]},
            {"id": "report", "type": "report", "label": "测试报告", "depends_on": ["execute"]}
        ]
    },
    {
        "id": "chatbot-design",
        "name": "智能客服对话流设计",
        "description": "设计多轮对话流程并生成训练数据",
        "category": "ai",
        "nodes": [
            {"id": "intent", "type": "intent", "label": "意图识别设计", "depends_on": []},
            {"id": "flow", "type": "flow", "label": "对话流设计", "depends_on": ["intent"]},
            {"id": "generate", "type": "generate", "label": "生成对话", "depends_on": ["flow"]},
            {"id": "validate", "type": "validate", "label": "逻辑验证", "depends_on": ["generate"]},
            {"id": "export", "type": "export", "label": "导出配置", "depends_on": ["validate"]},
            {"id": "train", "type": "train", "label": "训练数据", "depends_on": ["export"]}
        ]
    }
]

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows():
    """列出所有工作流模板"""
    return [WorkflowResponse(**w) for w in DEFAULT_WORKFLOWS]

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str):
    """获取工作流详情"""
    for w in DEFAULT_WORKFLOWS:
        if w["id"] == workflow_id:
            return WorkflowResponse(**w)
    raise HTTPException(status_code=404, detail="Workflow not found")

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(workflow: WorkflowCreate):
    """创建自定义工作流"""
    workflow_id = str(uuid.uuid4())
    new_workflow = {
        "id": workflow_id,
        "name": workflow.name,
        "description": workflow.description,
        "nodes": [node.dict() for node in workflow.nodes],
        "category": workflow.category,
        "created_at": datetime.now().isoformat()
    }
    workflows_db[workflow_id] = new_workflow
    return WorkflowResponse(**new_workflow)

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """删除工作流"""
    if workflow_id in workflows_db:
        del workflows_db[workflow_id]
        return {"message": "Workflow deleted"}
    raise HTTPException(status_code=404, detail="Workflow not found")


# ========== 工作流执行 ==========

class ExecuteWorkflowRequest(BaseModel):
    task: str
    api_key: str = ""
    api_base_url: str = ""
    api_format: str = "openai"
    model: str = ""


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: ExecuteWorkflowRequest):
    """执行工作流 — SSE 流式返回每个节点的执行状态"""
    # 查找工作流
    workflow = None
    for w in DEFAULT_WORKFLOWS:
        if w["id"] == workflow_id:
            workflow = w
            break
    if not workflow:
        workflow = workflows_db.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if not request.task.strip():
        raise HTTPException(status_code=400, detail="任务描述不能为空")

    nodes = workflow["nodes"]

    async def event_stream():
        import json
        # 发送工作流信息
        yield "data: " + json.dumps({"type": "workflow_start", "workflow_id": workflow_id, "name": workflow["name"], "node_count": len(nodes)}) + "\n\n"

        # 拓扑排序
        from app.core.workflow_engine import WorkflowEngine
        engine = WorkflowEngine()
        levels = engine.topological_sort(nodes)
        node_map = {n["id"]: n for n in nodes}

        # 逐层执行
        for level_idx, level in enumerate(levels):
            for node_id in level:
                node = node_map[node_id]
                yield "data: " + json.dumps({"type": "node_start", "node_id": node_id, "label": node["label"], "level": level_idx}) + "\n\n"

                # 模拟节点执行（真实场景会调用 AI API）
                await asyncio.sleep(0.5)

                # 节点完成
                yield "data: " + json.dumps({"type": "node_complete", "node_id": node_id, "output": node["label"] + "完成", "tokens": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}}) + "\n\n"

            # 层级间间隔
            if level_idx < len(levels) - 1:
                await asyncio.sleep(0.3)

        yield "data: " + json.dumps({"type": "workflow_complete", "total_tokens": {"prompt_tokens": len(nodes) * 100, "completion_tokens": len(nodes) * 50, "total_tokens": len(nodes) * 150}}) + "\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
