from sqlalchemy.orm import Session
from sqlalchemy import func
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