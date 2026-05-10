from fastapi import APIRouter

router = APIRouter()

# TODO: 接入真实数据采集后，替换以下空数据返回


@router.get("/summary")
async def get_analytics_summary():
    """获取统计摘要 — 当前无真实数据，返回零值"""
    return {
        "total_executions": 0,
        "successful_executions": 0,
        "success_rate": 0,
        "total_tokens": 0,
        "avg_execution_time": 0,
        "active_workflows": 0
    }


@router.get("/token-usage")
async def get_token_usage(days: int = 7):
    """获取 Token 使用统计 — 当前无真实数据，返回空列表"""
    return {"data": []}


@router.get("/execution-history")
async def get_execution_history(limit: int = 20):
    """获取执行历史 — 当前无真实数据，返回空列表"""
    return {"history": [], "total": 0}


@router.get("/node-stats")
async def get_node_stats():
    """获取节点类型统计 — 当前无真实数据"""
    return {}


@router.get("/model-usage")
async def get_model_usage():
    """获取模型使用统计 — 当前无真实数据"""
    return {}
