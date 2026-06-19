from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.deps import get_db
from .deps import get_current_user
from ..models.user import User
from ..schemas.ai import ChatRequest, ChatResponse, InsightsResponse
from ..services.ai import AIService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/insights", response_model=InsightsResponse)
def spending_insights(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate AI spending insights from the user's last 30 days of activity."""
    return AIService.generate_insights(db, user)


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Answer a natural-language finance question using the user's transactions."""
    history = [m.dict() for m in payload.history] if payload.history else None
    return AIService.chat(db, user, payload.question, history)


@router.get("/status")
def ai_status(user: User = Depends(get_current_user)):
    """Report whether the live LLM is configured (vs. rule-based fallback)."""
    return {"available": AIService.is_available()}
