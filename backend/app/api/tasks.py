from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# 数据模型
class TaskCreate(BaseModel):
    input_text: str
    workflow_id: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    input_text: str
    status: str
    progress: float = 0.0
    result: Optional[dict] = None
    created_at: datetime

# 模拟数据库
tasks_db = {}

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate):
    """创建新任务"""
    import uuid
    task_id = str(uuid.uuid4())
    new_task = {
        "id": task_id,
        "input_text": task.input_text,
        "workflow_id": task.workflow_id,
        "status": "pending",
        "progress": 0.0,
        "result": None,
        "created_at": datetime.now()
    }
    tasks_db[task_id] = new_task
    return TaskResponse(**new_task)

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """获取任务详情"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**tasks_db[task_id])

@router.get("/", response_model=List[TaskResponse])
async def list_tasks():
    """列出所有任务"""
    return [TaskResponse(**task) for task in tasks_db.values()]

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    del tasks_db[task_id]
    return {"message": "Task deleted"}

@router.post("/{task_id}/execute")
async def execute_task(task_id: str):
    """执行任务"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")

    # 模拟执行
    import asyncio
    tasks_db[task_id]["status"] = "running"

    # 这里应该调用工作流引擎，现在先返回成功
    return {"message": "Task execution started", "task_id": task_id}
