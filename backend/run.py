import uvicorn
from app.main import app
from app.config import settings

if __name__ == "__main__":
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║            NexusFlow Backend Starting...                    ║
    ║                                                            ║
    ║            API 文档：http://{settings.HOST}:{settings.PORT}/docs        ║
    ║            OpenAPI：http://{settings.HOST}:{settings.PORT}/openapi.json  ║
    ║                                                            ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower()
    )
