"""权限管理 API — 沙箱权限模板 CRUD"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.core.permissions import (
    list_permissions, get_permission, save_permission,
    delete_permission, SandboxPermission,
)

router = APIRouter()


class PermissionCreate(BaseModel):
    name: str
    description: str = ""
    allow_network: bool = False
    allow_filesystem: bool = True
    allow_subprocess: bool = False
    allow_env_vars: bool = False
    allow_imports: List[str] = []
    deny_imports: List[str] = []
    max_timeout: int = 30
    max_memory_mb: int = 512
    max_output_size: int = 1_000_000
    allowed_languages: List[str] = ["python", "javascript", "typescript"]


class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    allow_network: Optional[bool] = None
    allow_filesystem: Optional[bool] = None
    allow_subprocess: Optional[bool] = None
    allow_env_vars: Optional[bool] = None
    allow_imports: Optional[List[str]] = None
    deny_imports: Optional[List[str]] = None
    max_timeout: Optional[int] = None
    max_memory_mb: Optional[int] = None
    max_output_size: Optional[int] = None
    allowed_languages: Optional[List[str]] = None


@router.get("/permissions")
async def list_all_permissions():
    """列出所有权限模板"""
    return {"permissions": list_permissions()}


@router.get("/permissions/{permission_id}")
async def get_one_permission(permission_id: str):
    """获取单个权限模板"""
    perm = get_permission(permission_id)
    if not perm:
        raise HTTPException(status_code=404, detail="权限模板不存在")
    return perm.to_dict()


@router.post("/permissions")
async def create_permission(data: PermissionCreate):
    """创建自定义权限模板"""
    perm = SandboxPermission(
        id="",  # 自动生成
        name=data.name,
        description=data.description,
        allow_network=data.allow_network,
        allow_filesystem=data.allow_filesystem,
        allow_subprocess=data.allow_subprocess,
        allow_env_vars=data.allow_env_vars,
        allow_imports=data.allow_imports,
        deny_imports=data.deny_imports,
        max_timeout=data.max_timeout,
        max_memory_mb=data.max_memory_mb,
        max_output_size=data.max_output_size,
        allowed_languages=data.allowed_languages,
        is_builtin=False,
    )
    saved = save_permission(perm)
    return {"message": "权限模板创建成功", "permission": saved.to_dict()}


@router.put("/permissions/{permission_id}")
async def update_permission(permission_id: str, data: PermissionUpdate):
    """更新权限模板"""
    existing = get_permission(permission_id)
    if not existing:
        raise HTTPException(status_code=404, detail="权限模板不存在")
    if existing.is_builtin:
        raise HTTPException(status_code=400, detail="不能修改内置权限模板")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(existing, key, value)

    saved = save_permission(existing)
    return {"message": "权限模板更新成功", "permission": saved.to_dict()}


@router.delete("/permissions/{permission_id}")
async def remove_permission(permission_id: str):
    """删除自定义权限模板"""
    if not delete_permission(permission_id):
        raise HTTPException(status_code=400, detail="无法删除（可能是内置模板或不存在）")
    return {"message": "权限模板已删除"}
