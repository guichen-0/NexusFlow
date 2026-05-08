"""沙箱 API — 代码执行和文件管理"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from datetime import datetime
from collections import deque

from app.core.sandbox import sandbox, ExecutionResult
from app.core.permissions import get_permission

router = APIRouter()

# 内存中的执行历史（最近 100 条）
_execution_history: deque = deque(maxlen=100)

# 工作空间权限绑定（workspace_id -> permission_id）
_workspace_permissions: dict = {}


class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"
    timeout: Optional[int] = None
    stdin: Optional[str] = None
    workspace_id: Optional[str] = None
    permission_id: Optional[str] = None  # 权限模板 ID


class FileWriteRequest(BaseModel):
    workspace_id: str
    path: str
    content: str


class FileReadRequest(BaseModel):
    workspace_id: str
    path: str


class CreateWorkspaceRequest(BaseModel):
    permission_id: Optional[str] = None  # 创建时绑定权限


@router.post("/execute")
async def execute_code(request: ExecuteRequest):
    """执行代码（支持权限控制）"""
    supported = sandbox.SUPPORTED_LANGUAGES
    if request.language not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的语言: {request.language}。支持: {', '.join(supported)}"
        )

    if not request.code.strip():
        raise HTTPException(status_code=400, detail="代码不能为空")

    if len(request.code) > 100_000:
        raise HTTPException(status_code=400, detail="代码过长（最大 100KB）")

    # 获取工作空间
    workspace = None
    workspace_id = request.workspace_id
    if workspace_id:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
        if not os.path.exists(workspace):
            raise HTTPException(status_code=404, detail="工作空间不存在")

    # 解析权限
    perm_id = request.permission_id
    if not perm_id and workspace_id:
        perm_id = _workspace_permissions.get(workspace_id)
    perm = get_permission(perm_id) if perm_id else None

    result: ExecutionResult = await sandbox.execute(
        code=request.code,
        language=request.language,
        workspace_path=workspace,
        timeout=request.timeout,
        stdin_data=request.stdin,
        permissions=perm,
    )

    # 记录执行历史
    record = {
        "id": str(uuid.uuid4())[:8],
        "code": request.code[:500],  # 代码摘要
        "language": request.language,
        "permission_id": perm_id,
        "permission_name": perm.name if perm else None,
        "workspace_id": workspace_id,
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": result.duration_ms,
        "timed_out": result.timed_out,
        "success": result.exit_code == 0,
        "executed_at": datetime.now().isoformat(),
    }
    _execution_history.append(record)

    response = {
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": result.duration_ms,
        "timed_out": result.timed_out,
        "files": result.files_created,
        "success": result.exit_code == 0,
        "permission_id": perm_id,
        "permission_name": perm.name if perm else None,
    }

    return response


@router.get("/executions")
async def get_execution_history(limit: int = 50):
    """获取执行历史"""
    history = list(_execution_history)[-limit:]
    return {"executions": history, "total": len(_execution_history)}


@router.post("/workspace")
async def create_workspace(request: CreateWorkspaceRequest = None):
    """创建新的工作空间（可选绑定权限）"""
    workspace = sandbox.create_workspace()
    workspace_id = os.path.basename(workspace).replace("ws-", "")

    # 绑定权限
    perm_id = None
    if request and request.permission_id:
        perm = get_permission(request.permission_id)
        if not perm:
            raise HTTPException(status_code=404, detail="权限模板不存在")
        perm_id = request.permission_id
        _workspace_permissions[workspace_id] = perm_id

    return {
        "workspace_id": workspace_id,
        "path": workspace,
        "permission_id": perm_id,
        "created_at": datetime.now().isoformat(),
    }


@router.get("/workspace/{workspace_id}")
async def get_workspace(workspace_id: str):
    """获取工作空间信息（含权限）"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    info = sandbox.get_workspace_info(workspace)
    perm_id = _workspace_permissions.get(workspace_id)
    if perm_id:
        perm = get_permission(perm_id)
        info["permission_id"] = perm_id
        info["permission_name"] = perm.name if perm else None
    else:
        info["permission_id"] = None
        info["permission_name"] = None

    return info


@router.delete("/workspace/{workspace_id}")
async def delete_workspace(workspace_id: str):
    """删除工作空间"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")
    sandbox.cleanup_workspace(workspace)
    _workspace_permissions.pop(workspace_id, None)
    return {"message": "工作空间已删除"}


@router.put("/workspace/{workspace_id}/permission")
async def bind_permission(workspace_id: str, body: dict):
    """为工作空间绑定权限"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    perm_id = body.get("permission_id")
    if not perm_id:
        raise HTTPException(status_code=400, detail="permission_id 必填")

    perm = get_permission(perm_id)
    if not perm:
        raise HTTPException(status_code=404, detail="权限模板不存在")

    _workspace_permissions[workspace_id] = perm_id
    return {"message": f"已绑定权限: {perm.name}", "permission_id": perm_id}


@router.post("/workspace/file/write")
async def write_file(request: FileWriteRequest):
    """向工作空间写入文件"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{request.workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

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

    target = os.path.normpath(os.path.join(workspace, request.path))
    if not target.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")

    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="文件不存在")

    with open(target, "r", encoding="utf-8") as f:
        content = f.read()

    return {"path": request.path, "content": content}


@router.delete("/workspace/file/delete")
async def delete_file(workspace_id: str, path: str):
    """删除工作空间中的文件"""
    workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    target = os.path.normpath(os.path.join(workspace, path))
    if not target.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")

    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="文件不存在")

    os.remove(target)
    return {"message": "文件已删除", "path": path}


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
