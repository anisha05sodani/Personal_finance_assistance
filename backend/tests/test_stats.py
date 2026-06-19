"""Tests for the stats service: summary and monthly comparison."""
from datetime import date

from app.models.transaction import Transaction
from app.models.user import User
from app.services.stats import StatsService


def _make_user(db_session, email="stats@example.com"):
    user = User(email=email, hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _add(db_session, user, amount, type_, category, on_date):
    db_session.add(
        Transaction(
            amount=amount,
            type=type_,
            description="",
            date=on_date,
            category=category,
            user_id=user.id,
        )
    )
    db_session.commit()


def test_summary_returns_correct_totals(db_session):
    user = _make_user(db_session)
    _add(db_session, user, 1000, "income", "salary", date(2025, 5, 1))
    _add(db_session, user, 300, "expense", "food", date(2025, 5, 2))
    _add(db_session, user, 200, "expense", "rent", date(2025, 5, 3))

    summary = StatsService.summary(db_session, user)
    assert summary["total_income"] == 1000
    assert summary["total_expenses"] == 500
    assert summary["net_balance"] == 500
    assert summary["transaction_count"] == 3


def test_summary_is_scoped_per_user(db_session):
    user_a = _make_user(db_session, "a@example.com")
    user_b = _make_user(db_session, "b@example.com")
    _add(db_session, user_a, 100, "expense", "food", date(2025, 5, 2))
    _add(db_session, user_b, 999, "expense", "food", date(2025, 5, 2))

    summary = StatsService.summary(db_session, user_a)
    assert summary["total_expenses"] == 100
    assert summary["transaction_count"] == 1


def test_monthly_comparison(db_session):
    user = _make_user(db_session)
    today = date.today()
    current = date(today.year, today.month, 15)
    if today.month == 1:
        prev_month, prev_year = 12, today.year - 1
    else:
        prev_month, prev_year = today.month - 1, today.year
    previous = date(prev_year, prev_month, 15)

    _add(db_session, user, 200, "income", "salary", current)
    _add(db_session, user, 100, "expense", "food", current)
    _add(db_session, user, 50, "expense", "food", previous)

    result = StatsService.monthly_comparison(db_session, user)
    assert result["current_month"]["total_expenses"] == 100
    assert result["current_month"]["total_income"] == 200
    assert result["previous_month"]["total_expenses"] == 50
    # (100 - 50) / 50 * 100 == 100.0
    assert result["expense_change_percentage"] == 100.0
    assert result["trend"] == "up"


def test_category_summary(db_session):
    user = _make_user(db_session)
    _add(db_session, user, 100, "expense", "food", date(2025, 5, 1))
    _add(db_session, user, 50, "expense", "food", date(2025, 5, 2))
    _add(db_session, user, 75, "expense", "transport", date(2025, 5, 3))
    _add(db_session, user, 500, "income", "salary", date(2025, 5, 1))

    summary = {row["category"]: row["total"] for row in StatsService.category_summary(db_session, user)}
    assert summary["food"] == 150
    assert summary["transport"] == 75
    # income is excluded from the expense category summary
    assert "salary" not in summary
