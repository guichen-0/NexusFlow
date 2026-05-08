from fastapi import APIRouter
from app.api import tasks, workflows, agents, analytics

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(tasks.router, prefix="/tasks", tags=["任务管理"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["工作流管理"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agent 管理"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["数据分析"])
