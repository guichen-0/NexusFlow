"""沙箱权限模型 — 细粒度执行控制"""
from dataclasses import dataclass, field, asdict
from typing import Optional
import json
import os


@dataclass
class SandboxPermission:
    """沙箱执行权限配置"""
    id: str
    name: str
    description: str

    # 能力开关
    allow_network: bool = False          # 能否联网
    allow_filesystem: bool = True        # 能否读写文件
    allow_subprocess: bool = False       # 能否启动子进程
    allow_env_vars: bool = False         # 能否读取环境变量
    allow_terminal: bool = False         # 能否使用终端命令

    # Python 模块控制
    allow_imports: list = field(default_factory=list)   # 白名单（空=全部允许）
    deny_imports: list = field(default_factory=list)    # 黑名单

    # 资源限制
    max_timeout: int = 30                # 最大执行时间（秒）
    max_memory_mb: int = 512             # 内存限制（MB）
    max_output_size: int = 1_000_000     # 最大输出（字节）

    # 语言限制
    allowed_languages: list = field(default_factory=lambda: ["python", "javascript", "typescript"])

    # 元数据
    is_builtin: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SandboxPermission":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def get_effective_env(self) -> dict:
        """根据权限生成环境变量"""
        import os as _os
        env = {}

        if not self.allow_network:
            # 通过环境变量禁用网络
            env["NO_PROXY"] = "*"
            env["no_proxy"] = "*"
            env["HTTP_PROXY"] = ""
            env["HTTPS_PROXY"] = ""
            env["http_proxy"] = ""
            env["https_proxy"] = ""

        if not self.allow_env_vars:
            # 只保留基本环境变量
            for key in ["PATH", "SystemRoot", "COMSPEC", "TEMP", "TMP", "HOME",
                         "SystemDrive", "ProgramFiles", "ProgramFiles(x86)", "APPDATA",
                         "USERPROFILE", "PUBLIC", "CommonProgramFiles", "CommonProgramFiles(x86)"]:
                if key in _os.environ:
                    env[key] = _os.environ[key]
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            return env

        return env


# ==================== 预置权限模板 ====================

BUILTIN_PERMISSIONS = [
    # ---- 基础模板 ----
    SandboxPermission(
        id="isolated",
        name="完全隔离",
        description="最严格模式：禁止网络、子进程、环境变量，仅允许 Python 基础库，10 秒超时",
        allow_network=False,
        allow_filesystem=False,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=["math", "json", "re", "datetime", "collections", "itertools", "functools", "statistics", "string", "random", "decimal", "fractions", "typing", "dataclasses", "enum", "abc", "copy", "hashlib", "base64", "struct"],
        deny_imports=["os", "sys", "subprocess", "shutil", "pathlib", "socket", "http", "urllib", "requests", "ctypes", "importlib", "__builtins__"],
        max_timeout=10,
        max_memory_mb=128,
        allowed_languages=["python"],
        is_builtin=True,
    ),

    # ---- 数据科学类 ----
    SandboxPermission(
        id="data-analysis",
        name="数据分析",
        description="允许数据分析库（pandas/numpy/matplotlib），禁止网络和子进程",
        allow_network=False,
        allow_filesystem=True,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=[],
        deny_imports=["subprocess", "shutil", "socket", "http", "urllib", "requests", "ctypes", "webbrowser", "antigravity"],
        max_timeout=30,
        max_memory_mb=512,
        allowed_languages=["python"],
        is_builtin=True,
    ),
    SandboxPermission(
        id="machine-learning",
        name="机器学习",
        description="允许 sklearn/torch/tensorflow 等机器学习库，可读文件，禁止网络",
        allow_network=False,
        allow_filesystem=True,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=[],
        deny_imports=["subprocess", "shutil", "socket", "http", "urllib", "requests", "ctypes", "webbrowser"],
        max_timeout=120,
        max_memory_mb=1024,
        allowed_languages=["python"],
        is_builtin=True,
    ),

    # ---- 网络类 ----
    SandboxPermission(
        id="web-request",
        name="网络请求",
        description="允许 HTTP 请求（requests/urllib），适合 API 调用和数据获取",
        allow_network=True,
        allow_filesystem=True,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=[],
        deny_imports=["subprocess", "shutil", "ctypes", "webbrowser"],
        max_timeout=30,
        max_memory_mb=256,
        allowed_languages=["python", "javascript"],
        is_builtin=True,
    ),
    SandboxPermission(
        id="web-scraping",
        name="网页爬虫",
        description="网络 + 文件读写 + HTML 解析（bs4/lxml），适合爬虫和数据采集",
        allow_network=True,
        allow_filesystem=True,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=[],
        deny_imports=["subprocess", "shutil", "ctypes", "webbrowser"],
        max_timeout=60,
        max_memory_mb=512,
        allowed_languages=["python"],
        is_builtin=True,
    ),

    # ---- 开发工具类 ----
    SandboxPermission(
        id="frontend-dev",
        name="前端开发",
        description="JavaScript/TypeScript，可读写文件，适合前端工具链",
        allow_network=False,
        allow_filesystem=True,
        allow_subprocess=False,
        allow_env_vars=False,
        allow_terminal=False,
        allow_imports=[],
        deny_imports=[],
        max_timeout=30,
        max_memory_mb=256,
        allowed_languages=["javascript", "typescript"],
        is_builtin=True,
    ),
    SandboxPermission(
        id="terminal",
        name="终端命令",
        description="可执行系统命令（subprocess/shutil），拥有文件系统和终端访问权限",
        allow_network=False,
        allow_filesystem=True,
        allow_subprocess=True,
        allow_env_vars=True,
        allow_terminal=True,
        allow_imports=[],
        deny_imports=["ctypes"],
        max_timeout=60,
        max_memory_mb=512,
        allowed_languages=["python", "javascript"],
        is_builtin=True,
    ),
    SandboxPermission(
        id="dev-tools",
        name="开发工具箱",
        description="终端 + 网络 + 文件系统，适合开发调试，禁止 ctypes",
        allow_network=True,
        allow_filesystem=True,
        allow_subprocess=True,
        allow_env_vars=True,
        allow_terminal=True,
        allow_imports=[],
        deny_imports=["ctypes"],
        max_timeout=60,
        max_memory_mb=512,
        allowed_languages=["python", "javascript", "typescript"],
        is_builtin=True,
    ),

    # ---- 全能类 ----
    SandboxPermission(
        id="full-access",
        name="完全访问",
        description="不限制任何能力，仅建议用于受信任的 Agent",
        allow_network=True,
        allow_filesystem=True,
        allow_subprocess=True,
        allow_env_vars=True,
        allow_terminal=True,
        allow_imports=[],
        deny_imports=[],
        max_timeout=60,
        max_memory_mb=1024,
        allowed_languages=["python", "javascript", "typescript"],
        is_builtin=True,
    ),
]


# 权限持久化目录
PERMISSIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "permissions")


def _ensure_dir():
    os.makedirs(PERMISSIONS_DIR, exist_ok=True)


def list_permissions() -> list:
    """列出所有权限模板（内置 + 自定义）"""
    perms = [p.to_dict() for p in BUILTIN_PERMISSIONS]
    _ensure_dir()
    if os.path.exists(PERMISSIONS_DIR):
        for fname in os.listdir(PERMISSIONS_DIR):
            if fname.endswith(".json"):
                try:
                    with open(os.path.join(PERMISSIONS_DIR, fname), "r", encoding="utf-8") as f:
                        data = json.load(f)
                        perms.append(data)
                except (json.JSONDecodeError, KeyError):
                    pass
    return perms


def get_permission(permission_id: str) -> Optional[SandboxPermission]:
    """根据 ID 获取权限"""
    # 先查内置
    for p in BUILTIN_PERMISSIONS:
        if p.id == permission_id:
            return p
    # 再查自定义
    _ensure_dir()
    fpath = os.path.join(PERMISSIONS_DIR, f"{permission_id}.json")
    if os.path.exists(fpath):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                return SandboxPermission.from_dict(json.load(f))
        except (json.JSONDecodeError, KeyError):
            pass
    return None


def save_permission(permission: SandboxPermission) -> SandboxPermission:
    """保存自定义权限"""
    if permission.is_builtin:
        raise ValueError("不能修改内置权限模板")
    if not permission.id:
        import uuid
        permission.id = f"custom-{uuid.uuid4().hex[:8]}"
    _ensure_dir()
    fpath = os.path.join(PERMISSIONS_DIR, f"{permission.id}.json")
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(permission.to_dict(), f, ensure_ascii=False, indent=2)
    return permission


def delete_permission(permission_id: str) -> bool:
    """删除自定义权限"""
    # 不允许删除内置
    for p in BUILTIN_PERMISSIONS:
        if p.id == permission_id:
            return False
    fpath = os.path.join(PERMISSIONS_DIR, f"{permission_id}.json")
    if os.path.exists(fpath):
        os.remove(fpath)
        return True
    return False
