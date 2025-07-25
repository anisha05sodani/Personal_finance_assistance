from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: Optional[str]  # ISO datetime string
    class Config:
        orm_mode = True

class UserInDB(UserBase):
    id: int
    hashed_password: str
    class Config:
        orm_mode = True 