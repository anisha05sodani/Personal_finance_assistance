"""Shared pytest fixtures for the backend test suite.

This module configures the environment **before** the application is imported so
that:

* the app talks to a throwaway SQLite database (never ``finance.db``), and
* the AI provider credentials are blanked out, forcing the rule-based fallback
  paths so tests never make a network call.
"""
from __future__ import annotations

import os
import tempfile

# --------------------------------------------------------------------------- #
# Environment setup MUST happen before importing the app, because both the
# settings singleton and the SQLAlchemy engine are created at import time.
# --------------------------------------------------------------------------- #
_TEST_DB_FD, _TEST_DB_PATH = tempfile.mkstemp(suffix=".db", prefix="test_finance_")
os.close(_TEST_DB_FD)
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["ENVIRONMENT"] = "development"

# Blank every AI credential so AIService falls back to deterministic rule-based
# logic (no live LLM, no network) for the whole test session.
for _ai_key in ("AI_PROVIDER", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL", "ANTHROPIC_API_KEY"):
    os.environ[_ai_key] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine, SessionLocal  # noqa: E402
from app.core.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402

# Disable rate limiting during tests so repeated register/login calls across the
# suite don't trip slowapi's 10/minute limit and cause flaky 429s.
try:  # pragma: no cover - depends on optional slowapi being installed
    from app.core.rate_limit import limiter as _limiter

    if _limiter is not None:
        _limiter.enabled = False
except Exception:  # noqa: BLE001
    pass


def pytest_sessionfinish(session, exitstatus):  # noqa: ANN001
    """Remove the temporary SQLite file once the whole session is done."""
    try:
        engine.dispose()
        os.remove(_TEST_DB_PATH)
    except OSError:
        pass


@pytest.fixture(autouse=True)
def _fresh_schema():
    """Give every test a clean schema (fresh tables, no leftover rows)."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """A SQLAlchemy session for seeding data and asserting directly on the DB."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """A FastAPI TestClient wired to the throwaway test database."""

    def _override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, email: str, password: str) -> dict:
    """Register a user (ignore duplicate) and return an Authorization header."""
    client.post("/auth/register", json={"email": email, "password": password})
    resp = client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers(client):
    """Register + log in a default test user; returns a valid auth header."""
    return _register_and_login(client, "tester@example.com", "password123")


@pytest.fixture
def make_auth_headers(client):
    """Factory to register + log in additional users (e.g. for ownership tests)."""

    def _make(email: str, password: str = "password123") -> dict:
        return _register_and_login(client, email, password)

    return _make
