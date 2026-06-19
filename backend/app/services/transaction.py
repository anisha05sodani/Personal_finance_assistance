from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String
from fastapi import HTTPException, status
from ..models.transaction import Transaction
from ..schemas.transaction import TransactionCreate
from ..models.user import User
from typing import Optional, Dict, Any
from datetime import date
import math

class TransactionService:
    @staticmethod
    def get_transactions(
        db: Session, 
        user: User, 
        skip: int = 0, 
        limit: int = 20, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None, 
        category: Optional[str] = None, 
        type: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get transactions with pagination and filters"""
        query = db.query(Transaction).filter(Transaction.user_id == user.id)
        
        # Apply filters
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if category:
            query = query.filter(Transaction.category == category)
        if type:
            query = query.filter(Transaction.type == type)
        if search:
            term = f"%{search}%"
            filters = [
                Transaction.description.ilike(term),
                Transaction.category.ilike(term),
                cast(Transaction.amount, String).ilike(term),
            ]
            query = query.filter(or_(*filters))
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        items = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
        
        # Calculate pagination info
        total_pages = math.ceil(total / limit) if limit > 0 else 1
        current_page = (skip // limit) + 1 if limit > 0 else 1
        
        return {
            "items": items,
            "total": total,
            "page": current_page,
            "limit": limit,
            "total_pages": total_pages
        }

    @staticmethod
    def create_transaction(db: Session, user: User, tx_in: TransactionCreate):
        tx = Transaction(**tx_in.dict(), user_id=user.id)
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def update_transaction(db: Session, user: User, tx_id: int, tx_in: TransactionCreate):
        tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user.id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        for field, value in tx_in.dict().items():
            setattr(tx, field, value)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def delete_transaction(db: Session, user: User, tx_id: int):
        tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user.id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        db.delete(tx)
        db.commit()
        return None
    
    @staticmethod
    def get_transaction_count(db: Session, user: User) -> int:
        """Get total transaction count for user"""
        return db.query(Transaction).filter(Transaction.user_id == user.id).count() 