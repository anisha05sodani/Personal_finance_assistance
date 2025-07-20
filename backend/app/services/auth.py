from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.user import User
from ..schemas.user import UserCreate
from ..utils.security import hash_password, verify_password, create_access_token
from datetime import timedelta

class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserCreate):
        user = db.query(User).filter(User.email == user_in.email).first()
        if user:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_pw = hash_password(user_in.password)
        new_user = User(email=user_in.email, hashed_password=hashed_pw)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str):
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_token(user: User):
        token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=60*24)
        )
        return token 