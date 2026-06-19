from pydantic import BaseModel
from typing import List, Optional, Literal


class InsightsResponse(BaseModel):
    insights: List[str]
    source: str = "ai"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    answer: str
    source: str = "ai"
