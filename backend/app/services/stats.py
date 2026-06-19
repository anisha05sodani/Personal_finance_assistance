from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from ..models.transaction import Transaction
from ..models.category import Category
from ..models.user import User
from datetime import date
from typing import List, Dict

class StatsService:
    @staticmethod
    def category_summary(db: Session, user: User) -> List[Dict]:
        # Sum expenses by category using the category string field
        results = (
            db.query(Transaction.category, func.sum(Transaction.amount))
            .filter(Transaction.user_id == user.id, Transaction.type == 'expense')
            .group_by(Transaction.category)
            .all()
        )
        return [{"category": cat, "total": float(total or 0)} for cat, total in results]

    @staticmethod
    def expense_timeline(db: Session, user: User) -> List[Dict]:
        # Sum expenses by date
        results = (
            db.query(Transaction.date, func.sum(Transaction.amount))
            .filter(Transaction.user_id == user.id, Transaction.type == 'expense')
            .group_by(Transaction.date)
            .order_by(Transaction.date)
            .all()
        )
        return [{"date": d.isoformat(), "total": float(total or 0)} for d, total in results]

    @staticmethod
    def summary(db: Session, user: User) -> Dict:
        """Get total income, total expenses, and net balance for the user"""
        # Total income
        income_result = (
            db.query(func.sum(Transaction.amount))
            .filter(Transaction.user_id == user.id, Transaction.type == 'income')
            .scalar()
        )
        total_income = float(income_result or 0)

        # Total expenses
        expense_result = (
            db.query(func.sum(Transaction.amount))
            .filter(Transaction.user_id == user.id, Transaction.type == 'expense')
            .scalar()
        )
        total_expenses = float(expense_result or 0)

        # Transaction count
        transaction_count = (
            db.query(func.count(Transaction.id))
            .filter(Transaction.user_id == user.id)
            .scalar()
        )

        return {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_balance": total_income - total_expenses,
            "transaction_count": transaction_count or 0
        }

    @staticmethod
    def _period_totals(db: Session, user: User, month: int, year: int) -> Dict:
        income = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == "income",
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .scalar()
        )
        expenses = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == "expense",
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .scalar()
        )
        return {
            "month": month,
            "year": year,
            "total_income": float(income or 0),
            "total_expenses": float(expenses or 0),
        }

    @classmethod
    def monthly_comparison(cls, db: Session, user: User) -> Dict:
        """Compare the current month's spend with the previous month's."""
        today = date.today()
        cur_month, cur_year = today.month, today.year
        if cur_month == 1:
            prev_month, prev_year = 12, cur_year - 1
        else:
            prev_month, prev_year = cur_month - 1, cur_year

        current = cls._period_totals(db, user, cur_month, cur_year)
        previous = cls._period_totals(db, user, prev_month, prev_year)

        cur_exp = current["total_expenses"]
        prev_exp = previous["total_expenses"]
        if prev_exp > 0:
            pct = round((cur_exp - prev_exp) / prev_exp * 100, 1)
        elif cur_exp > 0:
            pct = 100.0
        else:
            pct = 0.0

        return {
            "current_month": current,
            "previous_month": previous,
            "expense_change_percentage": pct,
            "trend": "up" if pct > 0 else ("down" if pct < 0 else "flat"),
        }
