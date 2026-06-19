"""Unit tests for the AIService rule-based helper functions.

These cover the deterministic fallback logic directly (no DB, no network) so the
service's offline behaviour is well covered.
"""
from types import SimpleNamespace

from app.core.config import settings
from app.services.ai import AIService


def _tx(amount, type_, category, description="", on_date="2025-05-10"):
    return SimpleNamespace(
        amount=amount,
        type=type_,
        category=category,
        description=description,
        date=on_date,
    )


def test_extract_insights_from_json():
    raw = '{"insights": ["You spent a lot on food", "Save more"]}'
    out = AIService._extract_insights(raw)
    assert out == ["You spent a lot on food", "Save more"]


def test_extract_insights_from_bullets():
    raw = "1. First insight\n2. Second insight\n- Third insight"
    out = AIService._extract_insights(raw)
    assert "First insight" in out
    assert "Third insight" in out


def test_fallback_insights_flags_outlier():
    txs = [
        _tx(10, "expense", "food"),
        _tx(10, "expense", "food"),
        _tx(10, "expense", "food"),
        _tx(200, "expense", "travel"),  # outlier > 3x the average expense
        _tx(2000, "income", "salary"),
    ]
    insights = AIService._fallback_insights(txs)
    assert any("Unusual" in i for i in insights)
    assert any("travel" in i.lower() for i in insights)


def test_fallback_chat_category_spend():
    txs = [_tx(250, "expense", "food"), _tx(100, "expense", "transport")]
    answer = AIService._fallback_chat(txs, "how much did I spend on food?")
    assert "250" in answer
    assert "food" in answer.lower()


def test_fallback_chat_highest_expense():
    txs = [_tx(20, "expense", "food"), _tx(500, "expense", "rent")]
    answer = AIService._fallback_chat(txs, "what was my biggest expense?")
    assert "500" in answer
    assert "rent" in answer.lower()


def test_fallback_chat_savings():
    txs = [_tx(1000, "income", "salary"), _tx(300, "expense", "food")]
    answer = AIService._fallback_chat(txs, "how much did I save?")
    assert "700" in answer


def test_fallback_chat_income():
    txs = [_tx(1500, "income", "salary")]
    answer = AIService._fallback_chat(txs, "what is my income?")
    assert "1,500" in answer or "1500" in answer


def test_fallback_chat_default():
    txs = [_tx(50, "expense", "misc")]
    answer = AIService._fallback_chat(txs, "tell me something random")
    assert "transaction" in answer.lower()


def test_categorize_receipt_returns_none_without_provider():
    # With no provider configured, categorisation must defer to the rule-based parser.
    assert AIService.categorize_receipt("some receipt text") is None


def test_is_available_true_for_openai_compatible(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "")
    monkeypatch.setattr(settings, "AI_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setattr(settings, "AI_MODEL", "llama3.1")
    assert AIService.is_available() is True


def test_chat_openai_success(monkeypatch):
    """The OpenAI-compatible provider path returns the model's content (httpx mocked)."""
    import httpx

    monkeypatch.setattr(settings, "AI_PROVIDER", "openai")
    monkeypatch.setattr(settings, "AI_BASE_URL", "http://test-host/v1")
    monkeypatch.setattr(settings, "AI_MODEL", "test-model")
    monkeypatch.setattr(settings, "AI_API_KEY", "test-key")

    captured = {}

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "Hello from the model"}}]}

    def _fake_post(url, json=None, headers=None, timeout=None):
        captured["url"] = url
        captured["headers"] = headers
        return _FakeResponse()

    monkeypatch.setattr(httpx, "post", _fake_post)

    out = AIService._chat_openai("system prompt", [{"role": "user", "content": "hi"}], 100)
    assert out == "Hello from the model"
    assert captured["url"] == "http://test-host/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"


def test_chat_openai_returns_none_without_config(monkeypatch):
    monkeypatch.setattr(settings, "AI_BASE_URL", "")
    monkeypatch.setattr(settings, "AI_MODEL", "")
    assert AIService._chat_openai("s", [{"role": "user", "content": "x"}], 50) is None


def test_chat_raw_dispatches_to_openai(monkeypatch):
    """_chat_raw routes to the OpenAI-compatible backend when that provider is active."""
    import httpx

    monkeypatch.setattr(settings, "AI_PROVIDER", "openai")
    monkeypatch.setattr(settings, "AI_BASE_URL", "http://test-host/v1")
    monkeypatch.setattr(settings, "AI_MODEL", "test-model")

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "routed-ok"}}]}

    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResponse())

    out = AIService._chat_raw("sys", [{"role": "user", "content": "q"}], 50)
    assert out == "routed-ok"

