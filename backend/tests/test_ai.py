"""Tests for the AI service's no-provider fallback behaviour.

The test environment blanks all AI credentials (see conftest), so the service
must never hit the network and must always return its deterministic rule-based
fallback. These tests assert that contract.
"""
from datetime import date, timedelta

from app.models.transaction import Transaction
from app.models.user import User
from app.services.ai import AIService


def _make_user(db_session, email="ai@example.com"):
    user = User(email=email, hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _add_recent(db_session, user, amount, type_, category):
    db_session.add(
        Transaction(
            amount=amount,
            type=type_,
            description="",
            date=date.today() - timedelta(days=1),
            category=category,
            user_id=user.id,
        )
    )
    db_session.commit()


def test_is_available_false_without_provider():
    assert AIService.is_available() is False


def test_generate_insights_empty_when_no_transactions(db_session):
    user = _make_user(db_session)
    result = AIService.generate_insights(db_session, user)
    assert result["source"] == "empty"
    assert isinstance(result["insights"], list)
    assert result["insights"]


def test_generate_insights_uses_fallback(db_session):
    user = _make_user(db_session)
    _add_recent(db_session, user, 1000, "income", "salary")
    _add_recent(db_session, user, 300, "expense", "food")
    _add_recent(db_session, user, 100, "expense", "transport")

    result = AIService.generate_insights(db_session, user)
    assert result["source"] == "fallback"
    assert isinstance(result["insights"], list)
    assert len(result["insights"]) >= 1
    # The fallback mentions the top spending category.
    assert any("food" in i.lower() for i in result["insights"])


def test_chat_uses_fallback(db_session):
    user = _make_user(db_session)
    _add_recent(db_session, user, 250, "expense", "food")

    result = AIService.chat(db_session, user, "How much did I spend on food?")
    assert result["source"] == "fallback"
    assert isinstance(result["answer"], str)
    assert "250" in result["answer"]


def test_ai_status_endpoint_reports_unavailable(client, auth_headers):
    resp = client.get("/ai/status", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"available": False}


def test_ai_chat_endpoint_returns_fallback(client, auth_headers):
    resp = client.post(
        "/ai/chat",
        json={"question": "What is my total income?"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["source"] == "fallback"
