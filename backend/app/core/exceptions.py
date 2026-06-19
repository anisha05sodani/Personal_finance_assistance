"""Centralised application exceptions and FastAPI handlers.

These provide a consistent error envelope while remaining backward compatible
with existing clients: every error response still includes a top-level ``detail``
field (used by the current frontend) alongside the richer ``success`` /
``message`` / ``error_code`` fields.
"""
from __future__ import annotations

from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base class for known, handled application errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    error_code: str = "app_error"

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundException(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "not_found"


class UnauthorizedException(AppException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "unauthorized"


class ValidationException(AppException):
    status_code = 422
    error_code = "validation_error"


class ConflictException(AppException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "conflict"


def register_exception_handlers(app) -> None:
    @app.exception_handler(AppException)
    async def _app_exception_handler(request: Request, exc: AppException):  # noqa: ANN001
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "error_code": exc.error_code,
                # Backward compatibility with clients reading `detail`.
                "detail": exc.message,
            },
        )
