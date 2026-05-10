from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "NexusFlow"
    DEBUG: bool = True

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS 配置
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./nexusflow.db"

    # AI 服务配置
    USE_MOCK_MODE: bool = True
    AI_API_KEY: Optional[str] = "mock"
    AI_BASE_URL: str = "https://api.openai.com/v1"
    AI_MODEL: str = "gpt-3.5-turbo"

    # 可用模型列表
    AVAILABLE_MODELS: list = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "mimo-v2.5", "mimo-v2.5-pro", "deepseek-v3", "deepseek-r1", "deepseek-v4-flash", "deepseek-v4-pro"]

    # 日志配置
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
