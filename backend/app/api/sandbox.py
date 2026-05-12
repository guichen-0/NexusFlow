"""沙箱 API — 代码执行和文件管理"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
import sys
import uuid
import json
from datetime import datetime
from collections import deque
import asyncio
import subprocess
import platform
import mimetypes

from app.core.sandbox import sandbox, ExecutionResult
from app.core.permissions import get_permission

router = APIRouter()

# 持久化文件路径
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
_LOCAL_WORKSPACES_FILE = os.path.join(_DATA_DIR, "local_workspaces.json")
_WORKSPACE_PERMISSIONS_FILE = os.path.join(_DATA_DIR, "workspace_permissions.json")
_EXECUTION_HISTORY_FILE = os.path.join(_DATA_DIR, "execution_history.json")


def _ensure_data_dir():
    os.makedirs(_DATA_DIR, exist_ok=True)


def _load_local_workspaces():
    """从磁盘加载本地工作空间注册表，失败时返回空 dict"""
    try:
        if os.path.exists(_LOCAL_WORKSPACES_FILE):
            with open(_LOCAL_WORKSPACES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_local_workspaces(data):
    """将本地工作空间注册表持久化到磁盘"""
    _ensure_data_dir()
    with open(_LOCAL_WORKSPACES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_workspace_permissions():
    """从磁盘加载工作空间权限绑定"""
    if os.path.exists(_WORKSPACE_PERMISSIONS_FILE):
        try:
            with open(_WORKSPACE_PERMISSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_workspace_permissions(data):
    """将工作空间权限绑定持久化到磁盘"""
    _ensure_data_dir()
    with open(_WORKSPACE_PERMISSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# 内存中的执行历史（最近 200 条，同时持久化到磁盘）
_MAX_HISTORY = 200


def _load_execution_history() -> deque:
    """从磁盘加载执行历史"""
    try:
        if os.path.exists(_EXECUTION_HISTORY_FILE):
            with open(_EXECUTION_HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return deque(data[-_MAX_HISTORY:], maxlen=_MAX_HISTORY)
    except Exception:
        pass
    return deque(maxlen=_MAX_HISTORY)


def _save_execution_history():
    """将执行历史持久化到磁盘"""
    _ensure_data_dir()
    try:
        with open(_EXECUTION_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(list(_execution_history), f, ensure_ascii=False, indent=2)
    except Exception:
        pass


_execution_history: deque = _load_execution_history()

# 工作空间权限绑定（workspace_id -> permission_id）
_workspace_permissions: dict = _load_workspace_permissions()

# 本地目录工作空间注册表（workspace_id -> {"path": str, "type": "local"}）
_local_workspaces: dict = _load_local_workspaces()


class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"
    timeout: Optional[int] = None
    stdin: Optional[str] = None
    workspace_id: Optional[str] = None
    permission_id: Optional[str] = None


class TerminalRequest(BaseModel):
    command: str
    workspace_id: Optional[str] = None
    permission_id: Optional[str] = None
    timeout: Optional[int] = None


class FileWriteRequest(BaseModel):
    workspace_id: str
    path: str
    content: str


class FileReadRequest(BaseModel):
    workspace_id: str
    path: str


class CreateWorkspaceRequest(BaseModel):
    type: str = "virtual"
    path: Optional[str] = None
    permission_id: Optional[str] = None


class MountLocalFolderRequest(BaseModel):
    path: str
    permission_id: Optional[str] = None


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
        _local_workspaces.update(_load_local_workspaces())
        local_info = _local_workspaces.get(workspace_id)
        if local_info:
            workspace = local_info["path"]
        else:
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

    record = {
        "id": str(uuid.uuid4())[:8],
        "code": request.code[:500],
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
    _save_execution_history()

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
    """创建新的工作空间（虚拟目录或挂载本地目录，可选绑定权限）"""
    ws_type = request.type if request else "virtual"
    ws_path = None

    if ws_type == "local":
        local_path = request.path if request else None
        if not local_path or not os.path.isabs(local_path):
            raise HTTPException(status_code=400, detail="本地目录路径必须为绝对路径")
        if not os.path.exists(local_path):
            raise HTTPException(status_code=400, detail=f"目录不存在: {local_path}")
        if not os.path.isdir(local_path):
            raise HTTPException(status_code=400, detail=f"路径不是目录: {local_path}")
        norm_path = os.path.normpath(local_path)
        ws_path = norm_path
    else:
        ws_path = sandbox.create_workspace()

    workspace_id = os.path.basename(ws_path).replace("ws-", "") if ws_type == "virtual" else f"local-{uuid.uuid4().hex[:8]}"

    perm_id = None
    if request and request.permission_id:
        perm = get_permission(request.permission_id)
        if not perm:
            raise HTTPException(status_code=404, detail="权限模板不存在")
        perm_id = request.permission_id

    _workspace_permissions[workspace_id] = perm_id
    _save_workspace_permissions(_workspace_permissions)

    if ws_type == "local":
        _local_workspaces[workspace_id] = {"path": ws_path, "type": "local"}
        _save_local_workspaces(_local_workspaces)

    return {
        "workspace_id": workspace_id,
        "path": ws_path,
        "type": ws_type,
        "permission_id": perm_id,
        "created_at": datetime.now().isoformat(),
    }


@router.get("/workspace/{workspace_id}")
async def get_workspace(workspace_id: str):
    """获取工作空间信息（含权限和类型）"""
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)
    if local_info:
        workspace = local_info["path"]
        ws_type = "local"
    else:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
        ws_type = "virtual"

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
    info["type"] = ws_type
    return info


@router.delete("/workspace/{workspace_id}")
async def delete_workspace(workspace_id: str, path: str = Query(default=None)):
    """删除工作空间（虚拟空间删除目录，本地空间只解除绑定）

    path 参数用于恢复本地工作空间：当 workspace_id 未在注册表中找到时，
    如果提供了 path，则按本地工作空间处理（解决多进程数据丢失问题）。
    """
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)

    # 注册表中未找到，但前端提供了 path → 按本地工作空间恢复处理
    if not local_info and path:
        # 路径合法性检查：必须是绝对路径且不以 .. 结尾
        if not os.path.isabs(path):
            raise HTTPException(status_code=400, detail="path 必须是绝对路径")
        # 即使物理目录已被删除，也允许解绑（清理残留注册信息）
        local_info = {"path": path, "type": "local"}

    if local_info:
        # 本地工作空间：从注册表移除（不删除物理目录）
        _local_workspaces.pop(workspace_id, None)
        _save_local_workspaces(_local_workspaces)
        _workspace_permissions.pop(workspace_id, None)
        _save_workspace_permissions(_workspace_permissions)
        return {"message": "本地工作空间已解除绑定（物理目录未删除）"}
    else:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
        if not os.path.exists(workspace):
            raise HTTPException(status_code=404, detail="工作空间不存在")
        sandbox.cleanup_workspace(workspace)
        _workspace_permissions.pop(workspace_id, None)
        _save_workspace_permissions(_workspace_permissions)
        return {"message": "工作空间已删除"}


@router.put("/workspace/{workspace_id}/permission")
async def bind_permission(workspace_id: str, body: dict):
    """为工作空间绑定权限"""
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
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
    _save_workspace_permissions(_workspace_permissions)
    return {"message": f"已绑定权限: {perm.name}", "permission_id": perm_id}


@router.post("/workspace/file/write")
async def write_file(request: FileWriteRequest):
    """向工作空间写入文件"""
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(request.workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
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
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(request.workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
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
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
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


@router.post("/terminal")
async def execute_terminal(request: TerminalRequest):
    """在终端中执行系统命令（受权限控制）"""
    if not request.command.strip():
        raise HTTPException(status_code=400, detail="命令不能为空")

    if len(request.command) > 10_000:
        raise HTTPException(status_code=400, detail="命令过长（最大 10KB）")

    # 检查权限是否允许终端
    perm_id = request.permission_id
    if request.workspace_id:
        perm_id = perm_id or _workspace_permissions.get(request.workspace_id)

    perm = get_permission(perm_id) if perm_id else None

    allow_terminal = True
    if perm is not None:
        allow_terminal = getattr(perm, "allow_terminal", False)
        if not allow_terminal:
            raise HTTPException(
                status_code=403,
                detail=f"当前权限模板 '{perm.name}' 不允许使用终端。请切换到支持终端的权限模板。"
            )
        perm_timeout = getattr(perm, "max_timeout", None)
        if perm_timeout:
            request.timeout = perm_timeout

    timeout = request.timeout or 30

    # 工作目录
    cwd = None
    if request.workspace_id:
        _local_workspaces.update(_load_local_workspaces())
        local_info = _local_workspaces.get(request.workspace_id)
        if local_info:
            cwd = local_info["path"]
        else:
            workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{request.workspace_id}")
            if not os.path.exists(workspace):
                raise HTTPException(status_code=404, detail="工作空间不存在")
            cwd = workspace

    # 环境变量
    exec_env = {**os.environ}
    if perm is not None and hasattr(perm, "get_effective_env"):
        exec_env = perm.get_effective_env()

    # Windows 用 cmd /c，Linux/Mac 用 /bin/sh -c
    if platform.system() == "Windows":
        exec_cmd = f'cmd /c "{request.command}"'
    else:
        exec_cmd = request.command

    start = datetime.now()

    def _run_subprocess():
        """在线程池中同步执行子进程，避开 asyncio 子进程 Windows 兼容问题"""
        try:
            proc = subprocess.run(
                exec_cmd,
                shell=True,
                capture_output=True,
                cwd=cwd,
                env=exec_env,
                timeout=timeout,
                text=False,
            )
            return proc
        except subprocess.TimeoutExpired as e:
            raise asyncio.TimeoutError() from e
        except Exception as e:
            raise e

    try:
        proc = await asyncio.get_event_loop().run_in_executor(None, _run_subprocess)
        duration = (datetime.now() - start).total_seconds() * 1000
        stdout_str = proc.stdout.decode("utf-8", errors="replace")[:sandbox.MAX_OUTPUT_SIZE] if proc.stdout else ""
        stderr_str = proc.stderr.decode("utf-8", errors="replace")[:sandbox.MAX_OUTPUT_SIZE] if proc.stderr else ""
        success = proc.returncode == 0

        result = {
            "exit_code": proc.returncode or 0,
            "stdout": stdout_str,
            "stderr": stderr_str,
            "duration_ms": int(duration),
            "timed_out": False,
            "success": success,
            "permission_id": perm_id,
            "permission_name": perm.name if perm else None,
        }

        _execution_history.append({
            "id": str(uuid.uuid4())[:8],
            "code": f"$ {request.command}",
            "language": "terminal",
            "permission_id": perm_id,
            "permission_name": perm.name if perm else None,
            "workspace_id": request.workspace_id,
            **result,
            "executed_at": datetime.now().isoformat(),
        })
        _save_execution_history()

        return result

    except asyncio.TimeoutError:
        duration = (datetime.now() - start).total_seconds() * 1000
        result = {
            "exit_code": -1,
            "stdout": "",
            "stderr": f"命令执行超时（{timeout}秒）",
            "duration_ms": int(duration),
            "timed_out": True,
            "success": False,
            "permission_id": perm_id,
            "permission_name": perm.name if perm else None,
        }
        _execution_history.append({
            "id": str(uuid.uuid4())[:8],
            "code": f"$ {request.command}",
            "language": "terminal",
            "permission_id": perm_id,
            "permission_name": perm.name if perm else None,
            "workspace_id": request.workspace_id,
            **result,
            "executed_at": datetime.now().isoformat(),
        })
        _save_execution_history()
        return result

    except Exception as e:
        duration = (datetime.now() - start).total_seconds() * 1000
        err_msg = str(e).strip() or f"{type(e).__name__}: {repr(e)}"
        result = {
            "exit_code": 1,
            "stdout": "",
            "stderr": f"执行错误: {err_msg}",
            "duration_ms": int(duration),
            "timed_out": False,
            "success": False,
            "permission_id": perm_id,
            "permission_name": perm.name if perm else None,
        }
        _execution_history.append({
            "id": str(uuid.uuid4())[:8],
            "code": f"$ {request.command}",
            "language": "terminal",
            **result,
            "executed_at": datetime.now().isoformat(),
        })
        _save_execution_history()
        return result


@router.get("/browse")
async def browse_directory(path: str = ""):
    """浏览文件系统目录，用于前端文件夹选择器"""
    if not path or path == "drives":
        import string
        drives = []
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                drives.append({
                    "name": f"{letter}: 盘",
                    "path": drive,
                    "is_dir": True,
                    "size": 0,
                })
        return {"path": "drives", "parent": None, "entries": drives}

    if not path:
        path = os.path.expanduser("~")

    path = os.path.abspath(path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"路径不存在: {path}")
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail=f"不是目录: {path}")

    parent = str(os.path.dirname(path))
    if parent == path:
        parent = "drives"

    try:
        entries = []
        for entry in sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower())):
            try:
                stat = entry.stat()
                entries.append({
                    "name": entry.name,
                    "path": entry.path,
                    "is_dir": entry.is_dir(),
                    "size": stat.st_size if not entry.is_dir() else 0,
                })
            except (PermissionError, OSError):
                entries.append({
                    "name": entry.name,
                    "path": entry.path,
                    "is_dir": entry.is_dir(),
                    "size": 0,
                    "error": "无法访问",
                })
        return {
            "path": path,
            "parent": parent,
            "entries": entries,
        }
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"无权限访问: {path}")


# ── 文件上传/下载 ──────────────────────────────────────────────


@router.post("/workspace/file/upload")
async def upload_file(workspace_id: str, path: str = "", file: UploadFile = File(...)):
    """上传文件到工作空间"""
    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    target_dir = os.path.normpath(os.path.join(workspace, path)) if path else workspace
    if not target_dir.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")

    os.makedirs(target_dir, exist_ok=True)
    filename = file.filename or "upload"
    target = os.path.join(target_dir, filename)

    content = await file.read()
    if len(content) > sandbox.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"文件过大（最大 {sandbox.MAX_FILE_SIZE // 1_000_000}MB）")

    with open(target, "wb") as f:
        f.write(content)

    rel_path = os.path.relpath(target, workspace)
    return {"message": "上传成功", "path": rel_path, "size": len(content)}


@router.get("/workspace/file/download")
async def download_file(workspace_id: str, path: str = ""):
    """下载工作空间中的文件"""
    if not path:
        raise HTTPException(status_code=400, detail="path 参数必填")

    _local_workspaces.update(_load_local_workspaces())
    local_info = _local_workspaces.get(workspace_id)
    if local_info:
        workspace = local_info["path"]
    else:
        workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="工作空间不存在")

    target = os.path.normpath(os.path.join(workspace, path))
    if not target.startswith(os.path.normpath(workspace)):
        raise HTTPException(status_code=403, detail="路径不合法")
    if not os.path.exists(target) or not os.path.isfile(target):
        raise HTTPException(status_code=404, detail="文件不存在")

    filename = os.path.basename(target)
    media_type = mimetypes.guess_type(target)[0] or "application/octet-stream"

    def iter_file():
        with open(target, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(
        iter_file(),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── SSE 流式执行 ──────────────────────────────────────────────


@router.post("/execute/stream")
async def execute_code_stream(request: ExecuteRequest):
    """流式执行代码 — 通过 SSE 实时推送 stdout/stderr"""
    if request.language not in sandbox.SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"不支持的语言: {request.language}")
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="代码不能为空")

    # 获取工作空间
    workspace = None
    workspace_id = request.workspace_id
    if workspace_id:
        _local_workspaces.update(_load_local_workspaces())
        local_info = _local_workspaces.get(workspace_id)
        if local_info:
            workspace = local_info["path"]
        else:
            workspace = os.path.join(sandbox.WORKSPACE_BASE, f"ws-{workspace_id}")
        if not os.path.exists(workspace):
            raise HTTPException(status_code=404, detail="工作空间不存在")

    # 解析权限
    perm_id = request.permission_id
    if not perm_id and workspace_id:
        perm_id = _workspace_permissions.get(workspace_id)
    perm = get_permission(perm_id) if perm_id else None

    # 准备脚本文件
    ext_map = {"python": ".py", "javascript": ".js", "typescript": ".ts"}
    ext = ext_map.get(request.language, ".py")
    script_name = f"stream_main{ext}"

    if workspace:
        script_path = os.path.join(workspace, script_name)
    else:
        tmp_dir = sandbox.create_workspace()
        script_path = os.path.join(tmp_dir, script_name)

    with open(script_path, "w", encoding="utf-8") as f:
        f.write(request.code)

    timeout = request.timeout
    if perm:
        perm_timeout = getattr(perm, "max_timeout", None)
        if perm_timeout and (timeout is None or timeout > perm_timeout):
            timeout = perm_timeout
    timeout = timeout or sandbox.MAX_EXECUTION_TIME

    # 环境变量
    exec_env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    if perm and hasattr(perm, "get_effective_env"):
        exec_env = perm.get_effective_env()

    cwd = workspace or os.path.dirname(script_path)

    # 选择解释器
    if request.language == "python":
        cmd = [sys.executable, "-u", script_path]
    else:
        cmd = ["node", script_path]

    async def event_generator():
        start_time = datetime.now()
        record_id = str(uuid.uuid4())[:8]
        full_stdout = ""
        full_stderr = ""

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=exec_env,
            )

            # 交错读取 stdout 和 stderr
            q: asyncio.Queue = asyncio.Queue()

            async def reader(stream, name):
                while True:
                    line = await stream.readline()
                    if not line:
                        await q.put(None)
                        break
                    text = line.decode("utf-8", errors="replace")
                    await q.put((name, text))

            readers = []
            if proc.stdout:
                readers.append(asyncio.create_task(reader(proc.stdout, "stdout")))
            if proc.stderr:
                readers.append(asyncio.create_task(reader(proc.stderr, "stderr")))

            # 带超时的读取
            try:
                while len(readers) > 0:
                    remaining = (start_time.timestamp() + timeout) - datetime.now().timestamp()
                    if remaining <= 0:
                        proc.kill()
                        await proc.wait()
                        yield json.dumps({"type": "error", "data": f"执行超时（{timeout}秒）"}) + "\n"
                        break
                    try:
                        item = await asyncio.wait_for(q.get(), timeout=min(remaining, 0.5))
                    except asyncio.TimeoutError:
                        continue
                    if item is None:
                        readers.pop(0) if readers else None
                        continue
                    name, text = item
                    if name == "stdout":
                        full_stdout += text
                    else:
                        full_stderr += text
                    yield json.dumps({"type": name, "data": text.rstrip("\n")}) + "\n"
            except Exception:
                pass

            # 等待进程结束
            try:
                await asyncio.wait_for(proc.wait(), timeout=2)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()

            duration = int((datetime.now() - start_time).total_seconds() * 1000)
            exit_code = proc.returncode or 0

            # 截断输出
            full_stdout = full_stdout[:sandbox.MAX_OUTPUT_SIZE]
            full_stderr = full_stderr[:sandbox.MAX_OUTPUT_SIZE]

            # 发送完成事件
            yield json.dumps({
                "type": "done",
                "exit_code": exit_code,
                "duration_ms": duration,
                "success": exit_code == 0,
            }) + "\n"

            # 记录执行历史
            record = {
                "id": record_id,
                "code": request.code[:500],
                "language": request.language,
                "permission_id": perm_id,
                "permission_name": perm.name if perm else None,
                "workspace_id": workspace_id,
                "exit_code": exit_code,
                "stdout": full_stdout,
                "stderr": full_stderr,
                "duration_ms": duration,
                "timed_out": exit_code == -1,
                "success": exit_code == 0,
                "executed_at": datetime.now().isoformat(),
            }
            _execution_history.append(record)
            _save_execution_history()

        except FileNotFoundError:
            yield json.dumps({"type": "error", "data": "解释器未找到"}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "data": str(e)}) + "\n"
        finally:
            # 清理临时文件（仅虚拟工作空间）
            if not workspace:
                try:
                    os.remove(script_path)
                except OSError:
                    pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )