from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="AI 多模型协作任务引擎 - 支持工作流编排、多 Agent 协作、Token 消耗统计",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "mode": "mock" if settings.USE_MOCK_MODE else "production",
        "endpoints": {
            "docs": "/docs",
            "openapi": "/openapi.json",
            "api": "/api/v1"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "mock_mode": settings.USE_MOCK_MODE}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
