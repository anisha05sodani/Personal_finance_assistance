from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..schemas.category import CategoryCreate, CategoryRead
from ..core.deps import get_db
from .deps import get_current_user
from ..services.category import CategoryService
from ..models.user import User
from typing import List

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[CategoryRead])
def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100)
):
    return CategoryService.get_categories(db, user, skip, limit)

@router.post("/", response_model=CategoryRead)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return CategoryService.create_category(db, user, category_in)

@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return CategoryService.update_category(db, user, category_id, category_in.name)

@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    CategoryService.delete_category(db, user, category_id)
    return None 