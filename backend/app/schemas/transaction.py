from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date

class TransactionBase(BaseModel):
    amount: float
    type: str  # 'income' or 'expense'
    description: Optional[str] = None
    date: date
    category: str

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than zero')
        if v > 1_000_000_000:
            raise ValueError('Amount is unrealistically large')
        return v

    @field_validator('category')
    @classmethod
    def category_not_blank(cls, v):
        v = (v or '').strip()
        if not v:
            raise ValueError('category must not be empty')
        return v

    @field_validator('type')
    @classmethod
    def type_must_be_valid(cls, v):
        if v not in ('income', 'expense'):
            raise ValueError('Type must be either "income" or "expense"')
        return v

class TransactionCreate(TransactionBase):
    pass

class TransactionRead(TransactionBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionRead]
    total: int
    page: int
    limit: int
    total_pages: int
    
    class Config:
        from_attributes = True 