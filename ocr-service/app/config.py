"""Application configuration.

All settings can be overridden with environment variables prefixed with ``OCR_``
(e.g. ``OCR_LANG=fr``, ``OCR_MAX_FILE_SIZE_MB=20``) or via a ``.env`` file.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Set

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings."""

    model_config = SettingsConfigDict(env_prefix="OCR_", env_file=".env", extra="ignore")

    # --- App metadata -----------------------------------------------------
    APP_NAME: str = "OCR & Image Understanding Service"
    APP_VERSION: str = "1.0.0"

    # --- Upload constraints ----------------------------------------------
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: Set[str] = {"jpg", "jpeg", "png", "webp", "pdf"}

    # --- OCR engine -------------------------------------------------------
    LANG: str = "en"            # PaddleOCR language (extensible: en, ch, fr, ...)
    USE_ANGLE_CLS: bool = True  # rotation/angle classifier
    USE_GPU: bool = False
    EAGER_LOAD: bool = True     # load the model at startup instead of first request

    # --- Preprocessing ----------------------------------------------------
    MIN_DIMENSION: int = 1000   # upscale images whose smallest side is below this
    APPLY_THRESHOLD: bool = True
    PARAGRAPH_Y_GAP_RATIO: float = 1.6
    PDF_RENDER_DPI: int = 200

    # --- Logging ----------------------------------------------------------
    LOG_LEVEL: str = "INFO"

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()


settings = get_settings()
