from typing import List, Dict, Any, Callable
from collections import deque
import asyncio

class WorkflowEngine:
    """工作流引擎：DAG 拓扑排序 + 并行执行"""

    @staticmethod
    def topological_sort(nodes: List[Dict]) -> List[List[str]]:
        """拓扑排序，返回可执行的分层列表"""
        # 构建邻接表和入度
        adj = {node["id"]: [] for node in nodes}
        in_degree = {node["id"]: 0 for node in nodes}

        for node in nodes:
            for dep in node.get("depends_on", []):
                adj[dep].append(node["id"])
                in_degree[node["id"]] += 1

        # BFS 拓扑排序
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        result = []

        while queue:
            current_level = list(queue)
            queue.clear()
            result.append(current_level)

            for nid in current_level:
                for next_id in adj[nid]:
                    in_degree[next_id] -= 1
                    if in_degree[next_id] == 0:
                        queue.append(next_id)

        return result

    async def execute(self, nodes: List[Dict], executor: Callable) -> Dict[str, Any]:
        """执行工作流"""
        # 拓扑排序
        levels = self.topological_sort(nodes)

        # 构建节点映射
        node_map = {node["id"]: node for node in nodes}
        results = {}

        # 逐层执行
        for level in levels:
            # 同一层的节点可以并行执行
            tasks = [executor(node_map[nid]) for nid in level]
            level_results = await asyncio.gather(*tasks)

            for nid, result in zip(level, level_results):
                results[nid] = result

        return results
