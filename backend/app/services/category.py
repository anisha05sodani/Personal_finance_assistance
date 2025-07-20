from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.category import Category
from ..schemas.category import CategoryCreate
from ..models.user import User

class CategoryService:
    @staticmethod
    def get_categories(db: Session, user: User, skip: int = 0, limit: int = 20):
        return db.query(Category).filter(Category.user_id == user.id).offset(skip).limit(limit).all()

    @staticmethod
    def create_category(db: Session, user: User, category_in: CategoryCreate):
        category = Category(name=category_in.name, user_id=user.id)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_category(db: Session, user: User, category_id: int, name: str):
        category = db.query(Category).filter(Category.id == category_id, Category.user_id == user.id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        category.name = name
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def delete_category(db: Session, user: User, category_id: int):
        category = db.query(Category).filter(Category.id == category_id, Category.user_id == user.id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        db.delete(category)
        db.commit()
        return None 