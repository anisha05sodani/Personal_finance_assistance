from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserRead(UserBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class UserInDB(UserBase):
    id: int
    hashed_password: str
    class Config:
        from_attributes = True 