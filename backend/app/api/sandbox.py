"""沙箱 API — 代码执行和文件管理"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid

from app.core.sandbox import sandbox, ExecutionResult

router = APIRouter()


class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"  # python | javascript | typescript
    timeout: Optional[int] = None  # 秒，默认 30
    stdin: Optional[str] = None
    workspace_id: Optional[str] = None  # 复用已有工作空间


class FileWriteRequest(BaseModel):
    workspace_id: str
    path: str  # 相对路径
    content: str


class FileReadRequest(BaseModel):
    workspace_id: str
    path: str


@router.post("/execute")
async def execute_code(request: ExecuteRequest):
    """执行代码"""
    # 验证语言
    supported = sandbox.SUPPORTED_LANGUAGES
    if request.language not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的语言: {request.language}。支持: {', '.join(supported)}"
        )

    # 验证代码不为空
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="代码不能为空")

    # 验证代码长度
    if len(request.code) > 100_000:
        raise HTTPException(status_code=400, detail="代码过长（最大 100KB）")

    # 获取或创建工作空间
    workspace = None
    if request.workspace_id:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{request.workspace_id}")
        if not os.path.exists(workspace):
            raise HTTPException(status_code=404, detail="工作空间不存在")

    result: ExecutionResult = await sandbox.execute(
        code=request.code,
        language=request.language,
        workspace_path=workspace,
        timeout=request.timeout,
        stdin_data=request.stdin,
    )

    return {
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": result.duration_ms,
        "timed_out": result.timed_out,
        "files": result.files_created,
        "success": result.exit_code == 0,
    }


@router.post("/workspace")
async def create_workspace():
    """创建新的工作空间"""
    workspace = sandbox.create_workspace()
    workspace_id = os.path.basename(workspace).replace("ws-", "")
    return {
        "workspace_id": workspace_id,
        "path": workspace,
    }


@router.get("/workspace/{workspace_id}")
async def get_workspace(workspace_id: str):
    """获取工作空间信息"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")
    return sandbox.get_workspace_info(workspace)


@router.delete("/workspace/{workspace_id}")
async def delete_workspace(workspace_id: str):
    """删除工作空间"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")
    sandbox.cleanup_workspace(workspace)
    return {"message": "工作空间已删除"}


@router.post("/workspace/file/write")
async def write_file(request: FileWriteRequest):
    """向工作空间写入文件"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{request.workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    # 安全检查：防止路径遍历
    target = os.path.normpath(os.path.join(workspace, request.path))
    if not target.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")

    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        f.write(request.content)

    return {"message": "文件写入成功", "path": request.path}


@router.post("/workspace/file/read")
async def read_file(request: FileReadRequest):
    """从工作空间读取文件"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{request.workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    # 安全检查
    target = os.path.normpath(os.path.join(workspace, request.path))
    if not target.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")

    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="文件不存在")

    with open(target, "r", encoding="utf-8") as f:
        content = f.read()

    return {"path": request.path, "content": content}


@router.get("/languages")
async def get_supported_languages():
    """获取支持的语言列表"""
    return {
        "languages": [
            {"id": "python", "name": "Python", "version": "3.x"},
            {"id": "javascript", "name": "JavaScript", "version": "ES2022+"},
            {"id": "typescript", "name": "TypeScript", "version": "5.x (transpiled)"},
        ]
    }
