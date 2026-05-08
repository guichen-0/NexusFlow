from typing import List, Dict, Any
import re

class TaskParser:
    """任务解析器：自然语言输入 → DAG 工作流"""

    # 关键词映射
    KEYWORD_MAP = {
        "代码": "code-factory",
        "写代码": "code-factory",
        "编程": "code-factory",
        "文章": "content-pipeline",
        "内容": "content-pipeline",
        "写作": "content-pipeline",
        "批量": "batch-processor",
        "处理": "batch-processor",
        "翻译": "translation-pipeline",
        "多语言": "translation-pipeline",
        "测试": "test-case-gen",
        "测试用例": "test-case-gen",
        "客服": "chatbot-design",
        "对话": "chatbot-design",
        "训练数据": "train-data-gen",
        "数据集": "train-data-gen"
    }

    @classmethod
    def parse(cls, input_text: str) -> Dict[str, Any]:
        """解析用户输入，返回工作流 DAG"""
        input_lower = input_text.lower()

        # 1. 识别任务类型
        workflow_id = "code-factory"  # 默认
        for keyword, wf_id in cls.KEYWORD_MAP.items():
            if keyword in input_lower:
                workflow_id = wf_id
                break

        # 2. 提取参数
        params = cls._extract_params(input_text)

        # 3. 返回工作流定义（从 workflows.py 获取）
        from app.api.workflows import DEFAULT_WORKFLOWS
        workflow_def = None
        for w in DEFAULT_WORKFLOWS:
            if w["id"] == workflow_id:
                workflow_def = w
                break

        if not workflow_def:
            workflow_def = DEFAULT_WORKFLOWS[0]  # 兜底

        return {
            "workflow_id": workflow_def["id"],
            "workflow_name": workflow_def["name"],
            "nodes": workflow_def["nodes"],
            "input_text": input_text,
            "params": params
        }

    @classmethod
    def _extract_params(cls, text: str) -> Dict[str, Any]:
        """提取关键参数"""
        params = {}

        # 提取编程语言
        lang_pattern = r"(python|javascript|typescript|java|c\+\+|go|rust|php|ruby)"
        lang_match = re.search(lang_pattern, text, re.IGNORECASE)
        if lang_match:
            params["language"] = lang_match.group(1).lower()

        # 提取主题
        topic_pattern = r"(关于|主题|话题)[：:]\s*(.+)"
        topic_match = re.search(topic_pattern, text)
        if topic_match:
            params["topic"] = topic_match.group(2).strip()

        return params
