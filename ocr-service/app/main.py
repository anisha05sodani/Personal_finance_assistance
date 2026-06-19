"""FastAPI application entrypoint for the OCR service.

Run with::

    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import ocr as ocr_routes
from .services.ocr_service import OCREngine


def configure_logging() -> None:
    logging.basicConfig(
        level=settings.LOG_LEVEL.upper(),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the OCR model once at startup (so requests don't pay the cost)."""
    configure_logging()
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    if settings.EAGER_LOAD:
        try:
            OCREngine.instance().load()
            logger.info("OCR engine pre-loaded at startup.")
        except Exception as exc:  # noqa: BLE001 - don't crash if weights are missing
            logger.exception("Could not pre-load OCR engine: %s", exc)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready OCR & image understanding service powered by PaddleOCR.",
    lifespan=lifespan,
)

# Allow the frontend and backend origins to call this service from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Attach a request id and processing-time header to every response."""
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-ms"] = f"{elapsed_ms:.2f}"
    return response


@app.get("/health", tags=["Health"], summary="Liveness/readiness probe")
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ocr_loaded": OCREngine.instance().is_loaded,
    }


app.include_router(ocr_routes.router)
