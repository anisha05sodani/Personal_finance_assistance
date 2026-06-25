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


# --------------------------------------------------------------------------- #
# Text-to-SQL pipeline (deterministic parts — no LLM/network involved)
# --------------------------------------------------------------------------- #
def test_validate_spec_whitelists_unknown_fields():
    spec = AIService._validate_spec(
        {
            "intent": "delete",          # invalid -> coerced to "aggregate"
            "metric": "drop_table",      # invalid -> coerced to "sum"
            "filters": {
                "type": "evil",          # invalid -> None
                "category": "Food",
                "date_from": "not-a-date",  # invalid -> None
                "amount_min": -5,        # invalid (<0) -> None
            },
            "group_by": "passwords",     # invalid -> None
            "sort": "sideways",          # invalid -> None
            "limit": 99999,              # clamped to 200
        }
    )
    assert spec["intent"] == "aggregate"
    assert spec["metric"] == "sum"
    assert spec["filters"]["type"] is None
    assert spec["filters"]["category"] == "Food"
    assert spec["filters"]["date_from"] is None
    assert spec["filters"]["amount_min"] is None
    assert spec["group_by"] is None
    assert spec["sort"] is None
    assert spec["limit"] == 200


def test_run_spec_aggregate_sum_is_user_scoped(db_session):
    user = _make_user(db_session, "owner@example.com")
    other = _make_user(db_session, "intruder@example.com")
    _add_recent(db_session, user, 100, "expense", "food")
    _add_recent(db_session, user, 50, "expense", "food")
    _add_recent(db_session, other, 999, "expense", "food")  # must NOT be counted

    spec = AIService._validate_spec(
        {"intent": "aggregate", "metric": "sum", "filters": {"type": "expense"}}
    )
    result = AIService._run_spec(db_session, user, spec)
    assert result["value"] == 150
    assert result["count"] == 2


def test_run_spec_list_sorted_desc_with_limit(db_session):
    user = _make_user(db_session, "lister@example.com")
    _add_recent(db_session, user, 10, "expense", "food")
    _add_recent(db_session, user, 300, "expense", "rent")
    _add_recent(db_session, user, 75, "expense", "transport")

    spec = AIService._validate_spec(
        {"intent": "list", "filters": {"type": "expense"}, "sort": "desc", "limit": 1}
    )
    result = AIService._run_spec(db_session, user, spec)
    assert result["intent"] == "list"
    assert len(result["rows"]) == 1
    assert result["rows"][0]["amount"] == 300


def test_run_spec_group_by_category(db_session):
    user = _make_user(db_session, "grouper@example.com")
    _add_recent(db_session, user, 100, "expense", "food")
    _add_recent(db_session, user, 40, "expense", "food")
    _add_recent(db_session, user, 200, "expense", "rent")

    spec = AIService._validate_spec(
        {"intent": "aggregate", "metric": "sum", "group_by": "category"}
    )
    result = AIService._run_spec(db_session, user, spec)
    totals = {g["key"]: g["value"] for g in result["groups"]}
    assert totals == {"food": 140, "rent": 200}


def test_format_result_aggregate_value():
    text = AIService._format_result(
        {"intent": "aggregate", "metric": "sum", "value": 1500, "count": 3}
    )
    assert "1,500" in text


def test_format_result_empty():
    text = AIService._format_result(
        {"intent": "aggregate", "metric": "sum", "value": 0, "count": 0}
    )
    assert "No matching" in text
