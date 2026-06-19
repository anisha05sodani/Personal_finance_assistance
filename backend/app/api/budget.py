from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.deps import get_db
from .deps import get_current_user
from ..models.user import User
from ..schemas.budget import BudgetCreate, BudgetStatus, BudgetUpdate
from ..services.budget import BudgetService

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/", response_model=List[BudgetStatus])
def list_budgets(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return BudgetService.list_budgets(db, user, month, year)


@router.post("/", response_model=BudgetStatus, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return BudgetService.create_budget(db, user, payload)


@router.put("/{budget_id}", response_model=BudgetStatus)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return BudgetService.update_budget(db, user, budget_id, payload)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    BudgetService.delete_budget(db, user, budget_id)
    return None
