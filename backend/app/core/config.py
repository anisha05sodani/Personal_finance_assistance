from pydantic_settings import BaseSettings
from pathlib import Path
import os

# Absolute path to backend/.env so the file is loaded regardless of the current
# working directory (e.g. when running uvicorn from the project root with
# --app-dir backend). config.py lives at backend/app/core/, so parents[2] == backend.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

class Settings(BaseSettings):
    # Deployment environment: "development" or "production". In production the
    # app refuses to start with insecure defaults (see the guard below).
    ENVIRONMENT: str = "development"
    # Use SQLite by default for easy development, or PostgreSQL if DATABASE_URL is set
    DATABASE_URL: str = "sqlite:///./finance.db"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    FRONTEND_URL: str = "http://localhost:5173"
    # Comma-separated list of allowed CORS origins (in addition to FRONTEND_URL).
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- AI integration (optional) ---
    # Set ANTHROPIC_API_KEY in your .env to enable AI features. When absent, the
    # app gracefully falls back to rule-based logic and never crashes.
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-latest"

    # Generic OpenAI-compatible provider (Groq, Ollama, OpenRouter, Gemini-compat...).
    # Leave AI_PROVIDER blank to auto-detect: Anthropic if its key is set, else this
    # OpenAI-compatible backend if AI_BASE_URL + AI_MODEL are set, else rule-based fallback.
    AI_PROVIDER: str = ""          # "anthropic" | "openai" | "" (auto)
    AI_BASE_URL: str = ""         # e.g. https://api.groq.com/openai/v1  or  http://localhost:11434/v1
    AI_API_KEY: str = ""          # provider key (leave blank for local Ollama)
    AI_MODEL: str = ""           # e.g. llama-3.1-8b-instant  or  llama3.1

    @property
    def cors_origins_list(self) -> list[str]:
        """Allowed CORS origins parsed from env, including FRONTEND_URL (deduped)."""
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"

settings = Settings()

# Fail fast in production if security-critical settings are left at their
# insecure development defaults.
_DEFAULT_SECRET = "change-this-secret-key-in-production"
if settings.ENVIRONMENT.lower() == "production" and settings.SECRET_KEY == _DEFAULT_SECRET:
    raise RuntimeError(
        "SECRET_KEY is still set to the insecure default. Set a strong, unique "
        "SECRET_KEY in the environment before running in production."
    ) 