from fastapi import APIRouter
from app.api import tasks, workflows, agents, analytics, chat, sandbox, permissions

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(chat.router, tags=["AI 聊天"])
api_router.include_router(sandbox.router, prefix="/sandbox", tags=["沙箱执行"])
api_router.include_router(permissions.router, prefix="/sandbox", tags=["权限管理"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["任务管理"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["工作流管理"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agent 管理"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["数据分析"])
