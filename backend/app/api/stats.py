from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.deps import get_db
from .deps import get_current_user
from ..services.stats import StatsService
from ..models.user import User
from typing import List, Dict

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/summary", response_model=Dict)
def get_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get total income, total expenses, and net balance"""
    return StatsService.summary(db, user)

@router.get("/category-summary", response_model=List[Dict])
def category_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return StatsService.category_summary(db, user)

@router.get("/expense-timeline", response_model=List[Dict])
def expense_timeline(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return StatsService.expense_timeline(db, user)


@router.get("/monthly-comparison", response_model=Dict)
def monthly_comparison(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Compare the current month's income/expenses against the previous month."""
    return StatsService.monthly_comparison(db, user) 