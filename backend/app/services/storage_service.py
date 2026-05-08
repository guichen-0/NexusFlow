from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

class StorageService:
    """存储服务：SQLite 数据库操作（简化版，使用 JSON 文件存储）"""

    def __init__(self, db_path: str = "./data"):
        self.db_path = db_path
        os.makedirs(db_path, exist_ok=True)

        # 数据文件
        self.tasks_file = os.path.join(db_path, "tasks.json")
        self.workflows_file = os.path.join(db_path, "workflows.json")
        self.agents_file = os.path.join(db_path, "agents.json")
        self.analytics_file = os.path.join(db_path, "analytics.json")

        # 初始化文件
        self._init_file(self.tasks_file, [])
        self._init_file(self.workflows_file, [])
        self._init_file(self.agents_file, [])
        self._init_file(self.analytics_file, {"executions": [], "token_usage": []})

    def _init_file(self, filepath: str, default_data):
        """初始化 JSON 文件"""
        if not os.path.exists(filepath):
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, ensure_ascii=False, indent=2)

    def _read_json(self, filepath: str) -> Any:
        """读取 JSON 文件"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _write_json(self, filepath: str, data: Any):
        """写入 JSON 文件"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    # 任务操作
    def save_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """保存任务"""
        tasks = self._read_json(self.tasks_file)
        task["created_at"] = datetime.now().isoformat()
        tasks.append(task)
        self._write_json(self.tasks_file, tasks)
        return task

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务"""
        tasks = self._read_json(self.tasks_file)
        for task in tasks:
            if task.get("id") == task_id:
                return task
        return None

    def list_tasks(self) -> List[Dict[str, Any]]:
        """列出所有任务"""
        return self._read_json(self.tasks_file)

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """更新任务"""
        tasks = self._read_json(self.tasks_file)
        for i, task in enumerate(tasks):
            if task.get("id") == task_id:
                tasks[i].update(updates)
                tasks[i]["updated_at"] = datetime.now().isoformat()
                self._write_json(self.tasks_file, tasks)
                return tasks[i]
        return None

    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        tasks = self._read_json(self.tasks_file)
        new_tasks = [t for t in tasks if t.get("id") != task_id]
        if len(new_tasks) < len(tasks):
            self._write_json(self.tasks_file, new_tasks)
            return True
        return False

    # 工作流操作
    def save_workflow(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """保存工作流"""
        workflows = self._read_json(self.workflows_file)
        workflow["created_at"] = datetime.now().isoformat()
        workflows.append(workflow)
        self._write_json(self.workflows_file, workflows)
        return workflow

    def list_workflows(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
        return self._read_json(self.workflows_file)

    # 统计数据操作
    def save_execution(self, execution: Dict[str, Any]):
        """保存执行记录"""
        data = self._read_json(self.analytics_file)
        execution["timestamp"] = datetime.now().isoformat()
        data["executions"].append(execution)
        self._write_json(self.analytics_file, data)

    def save_token_usage(self, usage: Dict[str, Any]):
        """保存 Token 使用记录"""
        data = self._read_json(self.analytics_file)
        usage["timestamp"] = datetime.now().isoformat()
        data["token_usage"].append(usage)
        self._write_json(self.analytics_file, data)

    def get_analytics(self) -> Dict[str, Any]:
        """获取统计数据"""
        data = self._read_json(self.analytics_file)
        executions = data.get("executions", [])
        token_usage = data.get("token_usage", [])

        return {
            "total_executions": len(executions),
            "successful_executions": len([e for e in executions if e.get("status") == "completed"]),
            "total_tokens": sum(t.get("total_tokens", 0) for t in token_usage),
            "executions_by_date": self._group_by_date(executions),
            "tokens_by_date": self._group_by_date(token_usage)
        }

    def _group_by_date(self, items: List[Dict]) -> Dict[str, int]:
        """按日期分组统计"""
        result = {}
        for item in items:
            date = item.get("timestamp", "")[:10]
            result[date] = result.get(date, 0) + 1
        return result
