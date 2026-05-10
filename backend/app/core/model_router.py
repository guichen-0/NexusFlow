from typing import Dict, Optional

class ModelRouter:
    """模型路由器：根据任务类型路由到合适模型"""

    # 模型配置
    MODEL_CONFIG = {
        "analyze": {"model": "gpt-4o", "temperature": 0.3},
        "generate": {"model": "gpt-4o", "temperature": 0.7},
        "review": {"model": "gpt-4o-mini", "temperature": 0.2},
        "fix": {"model": "gpt-4o", "temperature": 0.3},
        "report": {"model": "gpt-4o-mini", "temperature": 0.5},
        "topic": {"model": "gpt-4o-mini", "temperature": 0.8},
        "outline": {"model": "gpt-4o", "temperature": 0.6},
        "write": {"model": "gpt-4o", "temperature": 0.7},
        "translate": {"model": "gpt-4o", "temperature": 0.3},
        "schema": {"model": "deepseek-v3", "temperature": 0.2},
        "verify": {"model": "deepseek-r1", "temperature": 0.3},
        "multimodal": {"model": "mimo-v2.5", "temperature": 0.5},
        "fast_generate": {"model": "deepseek-v4-flash", "temperature": 0.7},
        "pro_generate": {"model": "deepseek-v4-pro", "temperature": 0.7},
        "default": {"model": "gpt-3.5-turbo", "temperature": 0.5}
    }

    @classmethod
    def route(cls, node_type: str, prefer_model: Optional[str] = None) -> Dict:
        """路由到合适的模型"""
        if prefer_model:
            return {"model": prefer_model, "temperature": 0.5}

        return cls.MODEL_CONFIG.get(node_type, cls.MODEL_CONFIG["default"])

    @classmethod
    def get_available_models(cls) -> list:
        """获取可用模型列表"""
        models = set()
        for config in cls.MODEL_CONFIG.values():
            models.add(config["model"])
        return list(models)
