from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..schemas.transaction import TransactionCreate, TransactionRead
from ..core.deps import get_db
from .deps import get_current_user
from ..services.transaction import TransactionService
from ..models.user import User
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/", response_model=List[TransactionRead])
def list_transactions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None)
):
    return TransactionService.get_transactions(db, user, skip, limit, start_date, end_date, category, type)

@router.post("/", response_model=TransactionRead)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return TransactionService.create_transaction(db, user, tx_in)

@router.put("/{tx_id}", response_model=TransactionRead)
def update_transaction(
    tx_id: int,
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return TransactionService.update_transaction(db, user, tx_id, tx_in)

@router.delete("/{tx_id}", status_code=204)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    TransactionService.delete_transaction(db, user, tx_id)
    return None 