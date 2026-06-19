from pydantic import BaseModel, field_validator
from typing import Optional

class CategoryBase(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Category name must not be empty")
        if len(v) > 50:
            raise ValueError("Category name must be at most 50 characters")
        return v

class CategoryCreate(CategoryBase):
    pass

class CategoryRead(CategoryBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True 