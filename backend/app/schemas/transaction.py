from pydantic import BaseModel
from typing import Optional
from datetime import date

class TransactionBase(BaseModel):
    amount: float
    type: str  # 'income' or 'expense'
    description: Optional[str] = None
    date: date
    category: str

class TransactionCreate(TransactionBase):
    pass

class TransactionRead(TransactionBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True 