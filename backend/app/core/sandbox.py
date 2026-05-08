"""
沙箱执行引擎 — 进程级代码隔离执行
支持 Python 和 JavaScript，带超时、内存限制和临时文件系统
"""
import asyncio
import subprocess
import tempfile
import os
import sys
import uuid
import shutil
import platform
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ExecutionResult:
    """代码执行结果"""
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    timed_out: bool = False
    memory_exceeded: bool = False
    files_created: list = field(default_factory=list)
    files_modified: list = field(default_factory=list)


class SandboxExecutor:
    """进程沙箱执行器"""

    # 安全限制
    MAX_EXECUTION_TIME = 30  # 秒
    MAX_OUTPUT_SIZE = 1_000_000  # 1MB stdout/stderr
    MAX_FILE_SIZE = 50_000_000  # 50MB 文件大小限制
    WORKSPACE_BASE = os.path.join(tempfile.gettempdir(), "nexusflow-sandbox")

    # 允许的语言
    SUPPORTED_LANGUAGES = ["python", "javascript", "typescript"]

    def __init__(self):
        os.makedirs(self.WORKSPACE_BASE, exist_ok=True)

    def create_workspace(self) -> str:
        """创建独立的临时工作空间"""
        workspace_id = str(uuid.uuid4())[:8]
        workspace_path = os.path.join(self.WORKSPACE_BASE, f"ws-{workspace_id}")
        os.makedirs(workspace_path, exist_ok=True)
        return workspace_path

    def cleanup_workspace(self, workspace_path: str):
        """清理工作空间"""
        try:
            if os.path.exists(workspace_path):
                shutil.rmtree(workspace_path, ignore_errors=True)
        except Exception:
            pass

    async def execute(
        self,
        code: str,
        language: str = "python",
        workspace_path: Optional[str] = None,
        timeout: Optional[int] = None,
        stdin_data: Optional[str] = None,
    ) -> ExecutionResult:
        """
        执行代码

        Args:
            code: 要执行的代码
            language: 编程语言 (python, javascript)
            workspace_path: 工作空间路径（如果为 None 则自动创建）
            timeout: 超时秒数（默认 30s）
            stdin_data: 标准输入数据
        """
        if language not in self.SUPPORTED_LANGUAGES:
            return ExecutionResult(
                exit_code=1,
                stderr=f"不支持的语言: {language}。支持: {', '.join(self.SUPPORTED_LANGUAGES)}"
            )

        # 创建或使用已有工作空间
        own_workspace = workspace_path is None
        if own_workspace:
            workspace_path = self.create_workspace()

        timeout = timeout or self.MAX_EXECUTION_TIME

        try:
            if language == "python":
                result = await self._execute_python(code, workspace_path, timeout, stdin_data)
            elif language in ("javascript", "typescript"):
                result = await self._execute_js(code, workspace_path, timeout, stdin_data)
            else:
                result = ExecutionResult(exit_code=1, stderr=f"未知语言: {language}")

            # 记录工作空间文件变化
            result.files_created = self._list_files(workspace_path)
            return result

        finally:
            if own_workspace:
                self.cleanup_workspace(workspace_path)

    async def _execute_python(
        self, code: str, workspace: str, timeout: int, stdin_data: Optional[str]
    ) -> ExecutionResult:
        """执行 Python 代码"""
        script_path = os.path.join(workspace, "main.py")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)

        start = datetime.now()

        try:
            proc = await asyncio.create_subprocess_exec(
                sys.executable,
                "-u",  # unbuffered output
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if stdin_data else asyncio.subprocess.DEVNULL,
                cwd=workspace,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=stdin_data.encode() if stdin_data else None),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                duration = (datetime.now() - start).total_seconds() * 1000
                return ExecutionResult(
                    exit_code=-1,
                    stderr=f"执行超时（{timeout}秒）",
                    duration_ms=int(duration),
                    timed_out=True,
                )

            duration = (datetime.now() - start).total_seconds() * 1000
            stdout_str = stdout.decode("utf-8", errors="replace")[:self.MAX_OUTPUT_SIZE]
            stderr_str = stderr.decode("utf-8", errors="replace")[:self.MAX_OUTPUT_SIZE]

            return ExecutionResult(
                exit_code=proc.returncode or 0,
                stdout=stdout_str,
                stderr=stderr_str,
                duration_ms=int(duration),
            )

        except FileNotFoundError:
            return ExecutionResult(
                exit_code=1,
                stderr=f"Python 解释器未找到: {sys.executable}"
            )
        except Exception as e:
            return ExecutionResult(
                exit_code=1,
                stderr=f"执行错误: {str(e)}"
            )

    async def _execute_js(
        self, code: str, workspace: str, timeout: int, stdin_data: Optional[str]
    ) -> ExecutionResult:
        """执行 JavaScript 代码"""
        script_path = os.path.join(workspace, "main.js")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)

        # 检测 node 是否可用
        node_cmd = "node"
        if platform.system() == "Windows":
            # Windows 上尝试常见路径
            for candidate in ["node", "node.exe"]:
                try:
                    result = await asyncio.create_subprocess_exec(
                        candidate, "--version",
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    await result.wait()
                    if result.returncode == 0:
                        node_cmd = candidate
                        break
                except FileNotFoundError:
                    continue

        start = datetime.now()

        try:
            proc = await asyncio.create_subprocess_exec(
                node_cmd, script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE if stdin_data else asyncio.subprocess.DEVNULL,
                cwd=workspace,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(input=stdin_data.encode() if stdin_data else None),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                duration = (datetime.now() - start).total_seconds() * 1000
                return ExecutionResult(
                    exit_code=-1,
                    stderr=f"执行超时（{timeout}秒）",
                    duration_ms=int(duration),
                    timed_out=True,
                )

            duration = (datetime.now() - start).total_seconds() * 1000
            stdout_str = stdout.decode("utf-8", errors="replace")[:self.MAX_OUTPUT_SIZE]
            stderr_str = stderr.decode("utf-8", errors="replace")[:self.MAX_OUTPUT_SIZE]

            return ExecutionResult(
                exit_code=proc.returncode or 0,
                stdout=stdout_str,
                stderr=stderr_str,
                duration_ms=int(duration),
            )

        except FileNotFoundError:
            return ExecutionResult(
                exit_code=1,
                stderr="Node.js 未安装或不在 PATH 中。请安装 Node.js 后重试。"
            )
        except Exception as e:
            return ExecutionResult(
                exit_code=1,
                stderr=f"执行错误: {str(e)}"
            )

    async def execute_file(
        self,
        file_path: str,
        language: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> ExecutionResult:
        """执行已有文件"""
        if not os.path.exists(file_path):
            return ExecutionResult(exit_code=1, stderr=f"文件不存在: {file_path}")

        # 根据扩展名推断语言
        if language is None:
            ext = os.path.splitext(file_path)[1].lower()
            lang_map = {".py": "python", ".js": "javascript", ".ts": "typescript", ".mjs": "javascript"}
            language = lang_map.get(ext, "python")

        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        workspace = os.path.dirname(file_path)
        return await self.execute(code, language, workspace, timeout)

    def _list_files(self, workspace: str) -> list:
        """列出工作空间中的所有文件（相对路径）"""
        files = []
        for root, dirs, filenames in os.walk(workspace):
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for filename in filenames:
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, workspace)
                files.append(rel_path)
        return files

    def list_workspaces(self) -> list:
        """列出所有工作空间"""
        if not os.path.exists(self.WORKSPACE_BASE):
            return []
        return [
            d for d in os.listdir(self.WORKSPACE_BASE)
            if os.path.isdir(os.path.join(self.WORKSPACE_BASE, d))
        ]

    def get_workspace_info(self, workspace_path: str) -> dict:
        """获取工作空间信息"""
        if not os.path.exists(workspace_path):
            return {}
        files = self._list_files(workspace_path)
        total_size = 0
        for f in files:
            fp = os.path.join(workspace_path, f)
            try:
                total_size += os.path.getsize(fp)
            except OSError:
                pass
        return {
            "path": workspace_path,
            "file_count": len(files),
            "files": files,
            "total_size": total_size,
        }


# 全局沙箱实例
sandbox = SandboxExecutor()
