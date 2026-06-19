"""OCR API routes."""
from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from starlette.concurrency import run_in_threadpool

from ..config import settings
from ..schemas.response import ErrorResponse, OCRResponse
from ..services.ocr_service import extract_text_from_bytes

logger = logging.getLogger(__name__)

router = APIRouter(tags=["OCR"])


def _resolve_extension(file: UploadFile) -> str:
    """Validate the upload's extension and return it (lower-cased, no dot)."""
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{extension or 'unknown'}'. "
                f"Allowed types: {sorted(settings.ALLOWED_EXTENSIONS)}."
            ),
        )
    return extension


@router.post(
    "/extract-text",
    response_model=OCRResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract text and layout from an image or PDF",
    responses={
        400: {"model": ErrorResponse, "description": "Empty file"},
        413: {"model": ErrorResponse, "description": "File too large"},
        415: {"model": ErrorResponse, "description": "Unsupported file type"},
        422: {"model": ErrorResponse, "description": "Unreadable image"},
        500: {"model": ErrorResponse, "description": "OCR failure"},
    },
)
async def extract_text_endpoint(
    request: Request,
    file: UploadFile = File(..., description="Image (jpg/jpeg/png/webp) or PDF to OCR."),
) -> OCRResponse:
    """Accept a multipart upload, run OCR, and return structured results."""
    request_id = getattr(request.state, "request_id", str(uuid4()))
    extension = _resolve_extension(file)

    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty.")
    if len(data) > settings.max_file_size_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds the maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB.",
        )

    start = time.perf_counter()
    try:
        # OCR is CPU-bound; run it in a worker thread to keep the event loop free.
        result = await run_in_threadpool(extract_text_from_bytes, data, extension)
    except ValueError as exc:
        logger.warning("[%s] Unprocessable file: %s", request_id, exc)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    except Exception as exc:  # noqa: BLE001 - surface any failure as a 500
        logger.exception("[%s] OCR processing failed: %s", request_id, exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "OCR processing failed."
        )

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    dimensions = result.get("image_dimensions") or {}
    logger.info(
        "[%s] OCR success | blocks=%s | size=%sx%s | pages=%s | %.2f ms",
        request_id,
        len(result.get("blocks", [])),
        dimensions.get("width"),
        dimensions.get("height"),
        result.get("num_pages"),
        elapsed_ms,
    )

    return OCRResponse(
        success=True,
        request_id=request_id,
        processing_time_ms=elapsed_ms,
        **result,
    )
