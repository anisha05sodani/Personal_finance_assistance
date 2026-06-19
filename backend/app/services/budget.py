"""Budget CRUD + spend computation service."""
from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from ..core.exceptions import ConflictException, NotFoundException
from ..models.budget import Budget
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.budget import BudgetCreate, BudgetUpdate


class BudgetService:
    @staticmethod
    def _spent_for(db: Session, user: User, category: str, month: int, year: int) -> float:
        total = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == "expense",
                Transaction.category == category,
                extract("month", Transaction.date) == month,
                extract("year", Transaction.date) == year,
            )
            .scalar()
        )
        return float(total or 0)

    @classmethod
    def _to_status(cls, db: Session, user: User, budget: Budget) -> Dict:
        spent = cls._spent_for(db, user, budget.category, budget.month, budget.year)
        limit = float(budget.monthly_limit)
        remaining = limit - spent
        percentage = round((spent / limit * 100), 1) if limit else 0.0
        return {
            "id": budget.id,
            "user_id": budget.user_id,
            "category": budget.category,
            "monthly_limit": limit,
            "month": budget.month,
            "year": budget.year,
            "created_at": budget.created_at,
            "updated_at": budget.updated_at,
            "spent": round(spent, 2),
            "remaining": round(remaining, 2),
            "percentage": percentage,
            "exceeded": spent > limit,
        }

    @classmethod
    def list_budgets(
        cls, db: Session, user: User, month: Optional[int] = None, year: Optional[int] = None
    ) -> List[Dict]:
        query = db.query(Budget).filter(Budget.user_id == user.id)
        if month is not None:
            query = query.filter(Budget.month == month)
        if year is not None:
            query = query.filter(Budget.year == year)
        budgets = query.order_by(Budget.year.desc(), Budget.month.desc(), Budget.category).all()
        return [cls._to_status(db, user, b) for b in budgets]

    @classmethod
    def create_budget(cls, db: Session, user: User, data: BudgetCreate) -> Dict:
        existing = (
            db.query(Budget)
            .filter(
                Budget.user_id == user.id,
                Budget.category == data.category,
                Budget.month == data.month,
                Budget.year == data.year,
            )
            .first()
        )
        if existing:
            raise ConflictException(
                f"A budget for '{data.category}' in {data.month}/{data.year} already exists."
            )
        budget = Budget(user_id=user.id, **data.dict())
        db.add(budget)
        db.commit()
        db.refresh(budget)
        return cls._to_status(db, user, budget)

    @classmethod
    def update_budget(cls, db: Session, user: User, budget_id: int, data: BudgetUpdate) -> Dict:
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user.id)
            .first()
        )
        if not budget:
            raise NotFoundException("Budget not found")
        for field, value in data.dict(exclude_unset=True).items():
            setattr(budget, field, value)
        db.commit()
        db.refresh(budget)
        return cls._to_status(db, user, budget)

    @staticmethod
    def delete_budget(db: Session, user: User, budget_id: int) -> None:
        budget = (
            db.query(Budget)
            .filter(Budget.id == budget_id, Budget.user_id == user.id)
            .first()
        )
        if not budget:
            raise NotFoundException("Budget not found")
        db.delete(budget)
        db.commit()
