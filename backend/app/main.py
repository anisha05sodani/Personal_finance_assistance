import logging
import os
import time
import traceback
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import (
    auth_router,
    category_router,
    transaction_router,
    upload_router,
    stats_router,
    user_router,
    budget_router,
    ai_router,
)
from .core.config import settings
from .core.exceptions import register_exception_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app.request")

# Optional rate limiting (slowapi). Guarded so the app still runs if the
# dependency isn't installed.
from .core.rate_limit import limiter, RATE_LIMITING_ENABLED

_RATE_LIMITING = RATE_LIMITING_ENABLED
if _RATE_LIMITING:
    from slowapi.errors import RateLimitExceeded
else:
    RateLimitExceeded = None  # type: ignore

app = FastAPI(title="Personal Finance Assistant API", version="1.0.0")

if _RATE_LIMITING:
    from slowapi.middleware import SlowAPIMiddleware

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc):  # noqa: ANN001
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "Too many requests. Please slow down and try again shortly.",
                "error_code": "rate_limited",
                "detail": "Rate limit exceeded",
            },
            headers={"Retry-After": "60"},
        )

# Register custom application exception handlers (consistent error envelope).
register_exception_handlers(app)


# Request logging middleware: assigns a request id and logs method, path,
# status, duration and client IP for every request.
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    start = time.perf_counter()
    client_ip = request.client.host if request.client else "-"
    try:
        response = await call_next(request)
    except Exception:  # noqa: BLE001 - logged then re-raised to global handler
        duration_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "rid=%s %s %s ip=%s -> 500 (%.1fms)",
            request_id, request.method, request.url.path, client_ip, duration_ms,
        )
        raise
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "rid=%s %s %s ip=%s -> %s (%.1fms)",
        request_id, request.method, request.url.path, client_ip,
        response.status_code, duration_ms,
    )
    return response


# Add exception handler to log unexpected errors (fallback / 500s).
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# CORS configuration - origins are loaded from environment variables (see config.py).
# Never hardcode "*" for production; set CORS_ORIGINS / FRONTEND_URL in your .env instead.
allowed_origins = settings.cors_origins_list

# For local development only you may opt into allowing all origins via CORS_ALLOW_ALL=true.
# This escape hatch is ignored in production to avoid an accidental CORS bypass.
if settings.ENVIRONMENT.lower() != "production" and os.getenv("CORS_ALLOW_ALL", "false").lower() == "true":
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(category_router)
app.include_router(transaction_router)
app.include_router(upload_router)
app.include_router(stats_router)
app.include_router(user_router)
app.include_router(budget_router)
app.include_router(ai_router)

@app.get("/")
def read_root():
    return {"message": "Personal Finance Assistant API"} 