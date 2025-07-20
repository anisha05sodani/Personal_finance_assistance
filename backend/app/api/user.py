from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.deps import get_db
from .deps import get_current_user
from ..models.user import User
from ..schemas.user import UserRead
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return UserRead.from_orm(current_user) 