from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from ..schemas.user import UserCreate, UserRead
from ..core.deps import get_db
from ..core.rate_limit import limit
from ..services.auth import AuthService
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead)
@limit("10/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    user = AuthService.register_user(db, user_in)
    return user

@router.post("/login")
@limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = AuthService.create_token(user)
    return {"access_token": token, "token_type": "bearer"}

# Token refresh endpoint can be added here if using refresh tokens 