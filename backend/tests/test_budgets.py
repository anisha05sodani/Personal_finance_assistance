"""Tests for budgets: creation, duplicate conflict, and spend computation."""
from datetime import date

from app.models.transaction import Transaction
from app.models.user import User


def _seed_expense(db_session, user_id, category, amount, on_date):
    db_session.add(
        Transaction(
            amount=amount,
            type="expense",
            description="seed",
            date=on_date,
            category=category,
            user_id=user_id,
        )
    )
    db_session.commit()


def _user_id(db_session, email="tester@example.com"):
    return db_session.query(User).filter(User.email == email).first().id


def test_create_budget(client, auth_headers):
    resp = client.post(
        "/budgets/",
        json={"category": "food", "monthly_limit": 500, "month": 5, "year": 2025},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["category"] == "food"
    assert body["monthly_limit"] == 500
    assert body["spent"] == 0
    assert body["remaining"] == 500
    assert body["exceeded"] is False


def test_duplicate_budget_returns_409(client, auth_headers):
    payload = {"category": "food", "monthly_limit": 500, "month": 5, "year": 2025}
    first = client.post("/budgets/", json=payload, headers=auth_headers)
    assert first.status_code == 201
    second = client.post("/budgets/", json=payload, headers=auth_headers)
    assert second.status_code == 409
    assert "already exists" in second.json()["detail"].lower()


def test_spend_calculation_is_correct(client, auth_headers, db_session):
    uid = _user_id(db_session)
    _seed_expense(db_session, uid, "food", 120, date(2025, 5, 3))
    _seed_expense(db_session, uid, "food", 80, date(2025, 5, 20))
    # Different category / month must NOT count toward the food/May budget.
    _seed_expense(db_session, uid, "transport", 999, date(2025, 5, 5))
    _seed_expense(db_session, uid, "food", 999, date(2025, 4, 5))

    resp = client.post(
        "/budgets/",
        json={"category": "food", "monthly_limit": 500, "month": 5, "year": 2025},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["spent"] == 200
    assert body["remaining"] == 300
    assert body["percentage"] == 40.0
    assert body["exceeded"] is False


def test_exceeded_flag(client, auth_headers, db_session):
    uid = _user_id(db_session)
    _seed_expense(db_session, uid, "shopping", 600, date(2025, 6, 10))

    resp = client.post(
        "/budgets/",
        json={"category": "shopping", "monthly_limit": 500, "month": 6, "year": 2025},
        headers=auth_headers,
    )
    body = resp.json()
    assert body["spent"] == 600
    assert body["remaining"] == -100
    assert body["exceeded"] is True


def test_budgets_are_scoped_to_user(client, auth_headers, make_auth_headers):
    client.post(
        "/budgets/",
        json={"category": "food", "monthly_limit": 500, "month": 5, "year": 2025},
        headers=auth_headers,
    )
    other = make_auth_headers("other-budget@example.com")
    resp = client.get("/budgets/", headers=other)
    assert resp.status_code == 200
    assert resp.json() == []
