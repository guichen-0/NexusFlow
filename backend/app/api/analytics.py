from fastapi import APIRouter
from typing import Dict, List, Any
from datetime import datetime, timedelta
import random

router = APIRouter()

@router.get("/summary")
async def get_analytics_summary():
    """获取统计摘要"""
    # Mock 数据
    return {
        "total_executions": 156,
        "successful_executions": 142,
        "success_rate": 91.0,
        "total_tokens": 1250000,
        "avg_execution_time": 12.5,  # 秒
        "active_workflows": 8
    }

@router.get("/token-usage")
async def get_token_usage(days: int = 7):
    """获取 Token 使用统计"""
    # 生成最近 N 天的模拟数据
    data = []
    today = datetime.now()

    for i in range(days):
        date = (today - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        data.append({
            "date": date,
            "tokens": random.randint(50000, 200000),
            "requests": random.randint(10, 50)
        })

    return {"data": data}

@router.get("/execution-history")
async def get_execution_history(limit: int = 20):
    """获取执行历史"""
    # Mock 数据
    history = []
    statuses = ["completed", "completed", "completed", "failed", "running"]

    for i in range(limit):
        history.append({
            "id": f"exec-{1000+i}",
            "workflow_name": get_mock_workflow_name(i),
            "status": statuses[i % len(statuses)],
            "started_at": (datetime.now() - timedelta(hours=i*2)).isoformat(),
            "duration": random.randint(5, 60),
            "tokens_used": random.randint(1000, 10000)
        })

    return {"history": history, "total": limit}

@router.get("/node-stats")
async def get_node_stats():
    """获取节点类型统计"""
    return {
        "analyze": {"count": 45, "avg_time": 3.2, "success_rate": 95.0},
        "generate": {"count": 38, "avg_time": 8.5, "success_rate": 89.0},
        "review": {"count": 35, "avg_time": 5.1, "success_rate": 94.0},
        "fix": {"count": 28, "avg_time": 6.3, "success_rate": 82.0},
        "report": {"count": 42, "avg_time": 4.0, "success_rate": 97.0}
    }

@router.get("/model-usage")
async def get_model_usage():
    """获取模型使用统计"""
    return {
        "gpt-4o": {"requests": 120, "tokens": 580000, "avg_time": 2.5},
        "gpt-4o-mini": {"requests": 85, "tokens": 320000, "avg_time": 1.2},
        "gpt-3.5-turbo": {"requests": 45, "tokens": 150000, "avg_time": 0.8},
        "mock-model": {"requests": 30, "tokens": 0, "avg_time": 0.3}
    }

def get_mock_workflow_name(index: int) -> str:
    """获取模拟的工作流名称"""
    names = [
        "自动代码工厂",
        "内容创作流水线",
        "批量任务处理器",
        "AI 训练数据生成",
        "多语言文档翻译管线",
        "代码 Review 自动化",
        "AI 驱动的测试用例生成",
        "智能客服对话流设计"
    ]
    return names[index % len(names)]
