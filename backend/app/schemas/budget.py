from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class BudgetBase(BaseModel):
    category: str
    monthly_limit: float
    month: int
    year: int

    @field_validator("category")
    @classmethod
    def category_not_blank(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("category must not be empty")
        return v

    @field_validator("monthly_limit")
    @classmethod
    def limit_positive(cls, v):
        if v <= 0:
            raise ValueError("monthly_limit must be greater than zero")
        return v

    @field_validator("month")
    @classmethod
    def month_valid(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("month must be between 1 and 12")
        return v

    @field_validator("year")
    @classmethod
    def year_valid(cls, v):
        if not 2000 <= v <= 2100:
            raise ValueError("year must be a valid 4-digit year")
        return v


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    monthly_limit: Optional[float] = None
    month: Optional[int] = None
    year: Optional[int] = None


class BudgetRead(BudgetBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetStatus(BudgetRead):
    """Budget enriched with computed spend for its period."""
    spent: float
    remaining: float
    percentage: float
    exceeded: bool
