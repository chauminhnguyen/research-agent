import uuid
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.rate_limit import limiter, auth_limiter
from app.middleware.logging import LoggingMiddleware
from app.auth.router import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.sessions import router as sessions_router
from app.routers.memory import router as memory_router
from app.routers.share import router as share_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Research Agent API...")
    yield
    logger.info("Shutting down Research Agent API...")


settings = get_settings()

app = FastAPI(
    title="Research Agent API",
    description="A full-stack AI research assistant with persistent memory",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.state.auth_limiter = auth_limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(LoggingMiddleware)

if settings.environment == "production":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(memory_router)
app.include_router(share_router)


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    logger.error(f"Request {request_id} failed: {exc}", exc_info=True)
    
    if settings.environment == "production":
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "request_id": request_id}
        )
    
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "request_id": request_id}
    )


@app.get("/")
async def root():
    return {"message": "Research Agent API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
