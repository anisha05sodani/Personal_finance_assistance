"""AI integration service (Anthropic Claude) with graceful fallback.

The service is intentionally defensive: if the ``anthropic`` package isn't
installed or ``ANTHROPIC_API_KEY`` is not configured, every method falls back to
deterministic rule-based logic so the application keeps working without the LLM.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.transaction import Transaction
from ..models.user import User

logger = logging.getLogger(__name__)


class AIService:
    _anthropic_client = None
    _anthropic_checked = False

    # ------------------------------------------------------------------ #
    # Provider selection / availability
    # ------------------------------------------------------------------ #
    @staticmethod
    def _provider() -> str:
        """Resolve the active AI provider.

        Explicit ``AI_PROVIDER`` wins; otherwise auto-detect from configured
        credentials. Returns "anthropic", "openai" (OpenAI-compatible: Groq,
        Ollama, OpenRouter, Gemini-compat...) or "" when nothing is configured.
        """
        provider = (settings.AI_PROVIDER or "").strip().lower()
        if provider in {"anthropic", "openai"}:
            return provider
        if settings.ANTHROPIC_API_KEY:
            return "anthropic"
        if settings.AI_BASE_URL and settings.AI_MODEL:
            return "openai"
        return ""

    @classmethod
    def is_available(cls) -> bool:
        provider = cls._provider()
        if provider == "anthropic":
            return cls._get_anthropic() is not None
        if provider == "openai":
            return bool(settings.AI_BASE_URL and settings.AI_MODEL)
        return False

    # ------------------------------------------------------------------ #
    # Anthropic backend
    # ------------------------------------------------------------------ #
    @classmethod
    def _get_anthropic(cls):
        """Lazily build the Anthropic client. Returns None when unavailable."""
        if cls._anthropic_checked:
            return cls._anthropic_client
        cls._anthropic_checked = True
        if not settings.ANTHROPIC_API_KEY:
            cls._anthropic_client = None
            return None
        try:
            import anthropic  # imported lazily; optional dependency

            cls._anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic client initialised.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Anthropic client unavailable (%s); using fallback.", exc)
            cls._anthropic_client = None
        return cls._anthropic_client

    @classmethod
    def _chat_anthropic(cls, system: str, messages: List[Dict[str, str]], max_tokens: int) -> Optional[str]:
        client = cls._get_anthropic()
        if client is None:
            return None
        try:
            message = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=messages,
            )
            return "\n".join(
                b.text for b in message.content if getattr(b, "type", None) == "text"
            ).strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Anthropic completion failed (%s); using fallback.", exc)
            return None

    # ------------------------------------------------------------------ #
    # OpenAI-compatible backend (Groq, Ollama, OpenRouter, Gemini-compat...)
    # ------------------------------------------------------------------ #
    @classmethod
    def _chat_openai(cls, system: str, messages: List[Dict[str, str]], max_tokens: int) -> Optional[str]:
        base_url = (settings.AI_BASE_URL or "").rstrip("/")
        model = settings.AI_MODEL
        if not base_url or not model:
            return None
        try:
            import httpx  # bundled with the anthropic SDK; always available
        except Exception:  # noqa: BLE001
            logger.warning("httpx unavailable; AI features use fallback.")
            return None
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": system}, *messages],
        }
        headers = {"Content-Type": "application/json"}
        if settings.AI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"
        try:
            resp = httpx.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return (data["choices"][0]["message"]["content"] or "").strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("OpenAI-compatible completion failed (%s); using fallback.", exc)
            return None

    # ------------------------------------------------------------------ #
    # Unified entry points
    # ------------------------------------------------------------------ #
    @classmethod
    def _chat_raw(cls, system: str, messages: List[Dict[str, str]], max_tokens: int = 800) -> Optional[str]:
        """Dispatch a chat completion to the active provider. Returns text or None."""
        provider = cls._provider()
        if provider == "anthropic":
            return cls._chat_anthropic(system, messages, max_tokens)
        if provider == "openai":
            return cls._chat_openai(system, messages, max_tokens)
        return None

    @classmethod
    def _complete(cls, system: str, user_content: str, max_tokens: int = 1024) -> Optional[str]:
        """Send a single-turn completion. Returns text or None on failure."""
        return cls._chat_raw(system, [{"role": "user", "content": user_content}], max_tokens)

    # ------------------------------------------------------------------ #
    # Data helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _recent_transactions(db: Session, user: User, days: int = 30) -> List[Transaction]:
        cutoff = date.today() - timedelta(days=days)
        return (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.date >= cutoff)
            .order_by(Transaction.date.desc())
            .all()
        )

    @staticmethod
    def _serialize(transactions: List[Transaction]) -> List[Dict[str, Any]]:
        return [
            {
                "date": t.date.isoformat() if t.date else None,
                "amount": float(t.amount),
                "type": t.type,
                "category": t.category,
                "description": t.description or "",
            }
            for t in transactions
        ]

    # ------------------------------------------------------------------ #
    # Feature 1: spending insights
    # ------------------------------------------------------------------ #
    @classmethod
    def generate_insights(cls, db: Session, user: User) -> Dict[str, Any]:
        transactions = cls._recent_transactions(db, user, days=30)
        if not transactions:
            return {
                "insights": ["No transactions in the last 30 days yet. Add some to unlock insights."],
                "source": "empty",
            }

        context = cls._serialize(transactions)
        system = (
            "You are a financial assistant.\n\n"
            "Analyze these transactions and generate:\n"
            "1. Three concise spending insights.\n"
            "2. One saving recommendation.\n"
            "3. One unusual spending observation if applicable.\n\n"
            "Keep the response under 200 words. Respond ONLY as a JSON object of the "
            'form {"insights": ["...", "..."]} with each item a short sentence.'
        )
        raw = cls._complete(system, json.dumps(context), max_tokens=800)
        if raw:
            parsed = cls._extract_insights(raw)
            if parsed:
                return {"insights": parsed, "source": "ai"}
        return {"insights": cls._fallback_insights(transactions), "source": "fallback"}

    @staticmethod
    def _extract_insights(raw: str) -> List[str]:
        # Try to parse a JSON object/array out of the model response.
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                items = data.get("insights")
                if isinstance(items, list):
                    return [str(i).strip() for i in items if str(i).strip()]
            except json.JSONDecodeError:
                pass
        # Fallback: split lines / bullet points.
        lines = [re.sub(r"^[\d\.\-\*\s]+", "", ln).strip() for ln in raw.splitlines()]
        return [ln for ln in lines if ln][:5]

    @staticmethod
    def _fallback_insights(transactions: List[Transaction]) -> List[str]:
        expenses = [t for t in transactions if t.type == "expense"]
        income = [t for t in transactions if t.type == "income"]
        total_exp = sum(t.amount for t in expenses)
        total_inc = sum(t.amount for t in income)

        insights: List[str] = []
        # Top category
        by_cat: Dict[str, float] = {}
        for t in expenses:
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
        if by_cat:
            top_cat, top_amt = max(by_cat.items(), key=lambda kv: kv[1])
            share = (top_amt / total_exp * 100) if total_exp else 0
            insights.append(
                f"Your highest spending category is '{top_cat}' at ₹{top_amt:,.0f} "
                f"({share:.0f}% of expenses in the last 30 days)."
            )
        insights.append(
            f"You spent ₹{total_exp:,.0f} across {len(expenses)} transactions in the last 30 days."
        )
        if total_inc:
            saved = total_inc - total_exp
            rate = (saved / total_inc * 100) if total_inc else 0
            insights.append(
                f"You saved ₹{saved:,.0f} ({rate:.0f}% of income). "
                + ("Great job keeping spending below income." if saved >= 0 else "Spending exceeded income this period.")
            )
        else:
            insights.append("Consider logging income transactions to track your savings rate.")
        # Saving recommendation
        if by_cat:
            insights.append(
                f"Saving tip: trimming '{top_cat}' by 10% would save about ₹{top_amt * 0.1:,.0f} per month."
            )
        # Unusual observation
        if expenses:
            avg = total_exp / len(expenses)
            largest = max(expenses, key=lambda t: t.amount)
            if largest.amount > avg * 3:
                insights.append(
                    f"Unusual: a ₹{largest.amount:,.0f} '{largest.category}' charge is well above your average of ₹{avg:,.0f}."
                )
        return insights[:5]

    # ------------------------------------------------------------------ #
    # Feature 2: chat assistant
    # ------------------------------------------------------------------ #
    @classmethod
    def chat(
        cls,
        db: Session,
        user: User,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        transactions = cls._recent_transactions(db, user, days=90)
        context = cls._serialize(transactions)
        system = (
            "You are a helpful personal-finance assistant. Answer the user's question "
            "using ONLY the provided transaction data (amounts are in INR). Be concise, "
            "friendly, and use markdown. If the data can't answer the question, say so."
        )
        if cls.is_available():
            messages: List[Dict[str, str]] = []
            for turn in (history or [])[-6:]:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                messages.append({"role": role, "content": str(turn.get("content", ""))})
            messages.append(
                {
                    "role": "user",
                    "content": f"Transactions (last 90 days):\n{json.dumps(context)}\n\nQuestion: {question}",
                }
            )
            text = cls._chat_raw(system, messages, max_tokens=600)
            if text:
                return {"answer": text, "source": "ai"}
        return {"answer": cls._fallback_chat(transactions, question), "source": "fallback"}

    @staticmethod
    def _fallback_chat(transactions: List[Transaction], question: str) -> str:
        q = question.lower()
        expenses = [t for t in transactions if t.type == "expense"]
        income = [t for t in transactions if t.type == "income"]

        # Category-specific spend
        categories = {t.category.lower() for t in transactions if t.category}
        mentioned = next((c for c in categories if c in q), None)
        if mentioned and ("spend" in q or "spent" in q or "spending" in q):
            total = sum(t.amount for t in expenses if t.category.lower() == mentioned)
            return f"You spent **₹{total:,.0f}** on **{mentioned}** in the recent period."
        if "highest" in q or "biggest" in q or "largest" in q:
            if expenses:
                top = max(expenses, key=lambda t: t.amount)
                return (
                    f"Your highest expense is **₹{top.amount:,.0f}** for "
                    f"**{top.category}**{(' — ' + top.description) if top.description else ''} on {top.date}."
                )
            return "I couldn't find any expenses to compare."
        if "save" in q or "saved" in q or "saving" in q:
            saved = sum(t.amount for t in income) - sum(t.amount for t in expenses)
            return f"Your net savings for the period is **₹{saved:,.0f}**."
        if "income" in q or "earn" in q:
            return f"Your total income for the period is **₹{sum(t.amount for t in income):,.0f}**."
        total_exp = sum(t.amount for t in expenses)
        return (
            f"In the recent period you had **{len(transactions)}** transactions and spent "
            f"**₹{total_exp:,.0f}**. (AI assistant is in offline mode — set ANTHROPIC_API_KEY "
            "for richer answers.)"
        )

    # ------------------------------------------------------------------ #
    # Feature 3: receipt categorisation
    # ------------------------------------------------------------------ #
    @classmethod
    def categorize_receipt(cls, ocr_text: str) -> Optional[Dict[str, Any]]:
        """Extract structured fields from raw OCR text via the LLM.

        Returns None when the LLM is unavailable so the caller can fall back to
        the existing rule-based parser.
        """
        if not ocr_text or not cls.is_available():
            return None
        system = (
            "You extract structured data from receipt OCR text. Respond ONLY with a JSON "
            "object: {\"merchant\": str, \"amount\": number, \"date\": \"YYYY-MM-DD\", "
            "\"category\": str, \"description\": str, \"confidence\": number between 0 and 1}. "
            "Pick category from: food, groceries, transport, shopping, utilities, rent, "
            "entertainment, health, travel, others. Use null for unknown fields."
        )
        raw = cls._complete(system, ocr_text, max_tokens=400)
        if not raw:
            return None
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
        data["raw_text"] = ocr_text
        return data
