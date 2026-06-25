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

from sqlalchemy import func
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
        """Answer a finance question.

        When the LLM is available, the question is first routed:
        - **data questions** (totals, lists, comparisons over the user's own
          transactions) go through the **Text-to-SQL** pipeline: the model emits a
          validated, whitelisted query spec, the backend runs it as a
          parameterised user-scoped ORM query, and the model phrases the exact
          result.
        - **general questions** (advice, definitions, greetings, anything not
          answerable from the transactions table) are answered with the model's
          own reasoning, using a compact summary of the user's finances only when
          relevant. Retrieved data is never echoed verbatim.

        Falls back to the deterministic rule-based engine when no LLM is set.
        """
        if cls.is_available():
            result = cls._answer_with_sql(db, user, question, history)
            if result is not None:
                return result
            text = cls._answer_general(db, user, question, history)
            if text:
                return {"answer": text, "source": "ai"}
        transactions = cls._recent_transactions(db, user, days=90)
        return {"answer": cls._fallback_chat(transactions, question), "source": "fallback"}

    # ------------------------------------------------------------------ #
    # Text-to-SQL pipeline
    # ------------------------------------------------------------------ #
    @classmethod
    def _answer_with_sql(
        cls,
        db: Session,
        user: User,
        question: str,
        history: Optional[List[Dict[str, str]]],
    ) -> Optional[Dict[str, Any]]:
        """Run the Text-to-SQL pipeline. Returns None to signal a fallback."""
        categories = cls._user_categories(db, user)
        raw_spec = cls._generate_query_spec(question, history, categories, date.today())
        if raw_spec is None:
            return None
        # The model flags questions that can't be answered from the transactions
        # table; route those to the general-knowledge responder instead.
        if str(raw_spec.get("intent", "")).lower() == "general":
            return None
        spec = cls._validate_spec(raw_spec)
        if spec is None:
            return None
        try:
            results = cls._run_spec(db, user, spec)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Text-to-SQL execution failed (%s); falling back.", exc)
            return None
        answer = cls._phrase_result(question, spec, results)
        if not answer:
            answer = cls._format_result(results)
        return {"answer": cls._tidy_answer(answer), "source": "ai-sql", "query": cls._spec_for_prompt(spec)}

    @staticmethod
    def _tidy_answer(text: str) -> str:
        """Strip trailing empty headings and collapse excess blank lines."""
        lines = [ln.rstrip() for ln in str(text).strip().splitlines()]
        # Drop trailing heading-only lines (a heading with no body beneath it).
        while lines and re.match(r"^#{1,6}\s", lines[-1]):
            lines.pop()
        # Collapse runs of blank lines into a single blank line.
        out: List[str] = []
        blank = False
        for ln in lines:
            if not ln.strip():
                if blank:
                    continue
                blank = True
            else:
                blank = False
            out.append(ln)
        return "\n".join(out).strip()

    @staticmethod
    def _user_categories(db: Session, user: User) -> set:
        rows = (
            db.query(Transaction.category)
            .filter(Transaction.user_id == user.id)
            .distinct()
            .all()
        )
        return {r[0] for r in rows if r[0]}

    @classmethod
    def _generate_query_spec(
        cls,
        question: str,
        history: Optional[List[Dict[str, str]]],
        categories: set,
        today: date,
    ) -> Optional[Dict[str, Any]]:
        """Ask the LLM to translate the question into a JSON query spec."""
        cat_list = ", ".join(sorted(categories)) or "(none yet)"
        system = (
            "You convert a personal-finance question into a JSON query spec over a "
            "transactions table. Respond with ONLY a JSON object — no prose, no code "
            "fences.\n\n"
            f"Today's date is {today.isoformat()}.\n"
            f"Known categories: {cat_list}.\n\n"
            "Spec schema:\n"
            "{\n"
            '  "intent": "aggregate" | "list" | "general",\n'
            '  "metric": "sum" | "avg" | "count" | "min" | "max",\n'
            '  "filters": {\n'
            '    "type": "expense" | "income" | null,\n'
            '    "category": string | null,\n'
            '    "date_from": "YYYY-MM-DD" | null,\n'
            '    "date_to": "YYYY-MM-DD" | null,\n'
            '    "amount_min": number | null,\n'
            '    "amount_max": number | null,\n'
            '    "description_contains": string | null\n'
            "  },\n"
            '  "group_by": "category" | "type" | "month" | null,\n'
            '  "sort": "asc" | "desc" | null,\n'
            '  "limit": integer | null\n'
            "}\n\n"
            "Rules:\n"
            "- Use 'aggregate' for totals/averages/counts; 'list' to show individual "
            "transactions.\n"
            "- Use 'general' ONLY when the question cannot be answered by querying the "
            "transactions table — e.g. financial advice ('how can I save more?'), "
            "definitions/explanations ('what is a good savings rate?'), greetings, or "
            "anything unrelated to the user's own recorded transactions. For 'general' you "
            "may return just {\"intent\": \"general\"}.\n"
            "- For a single 'highest/biggest/largest' (or 'lowest/smallest') item, use "
            "intent 'list' with sort 'desc' (or 'asc') and limit 1.\n"
            "- Resolve relative dates ('last month', 'this year', 'last 7 days') to "
            "concrete date_from/date_to using today's date.\n"
            "- Map the user's wording to the closest known category; leave category null "
            "if unsure.\n"
            "- Spending/expenses use type 'expense'; earnings/income use 'income'.\n"
            "- Output JSON only."
        )
        messages: List[Dict[str, str]] = []
        for turn in (history or [])[-4:]:
            role = "assistant" if turn.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": str(turn.get("content", ""))})
        messages.append({"role": "user", "content": question})
        raw = cls._chat_raw(system, messages, max_tokens=300)
        if not raw:
            return None
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None

    @staticmethod
    def _parse_spec_date(value: Any) -> Optional[date]:
        if not isinstance(value, str):
            return None
        try:
            return date.fromisoformat(value.strip())
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _parse_spec_amount(value: Any) -> Optional[float]:
        if value is None or isinstance(value, bool):
            return None
        try:
            amount = float(value)
        except (TypeError, ValueError):
            return None
        if amount < 0 or amount > 1e12:
            return None
        return amount

    @classmethod
    def _validate_spec(cls, spec: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Whitelist every field so only safe, known options reach the query builder."""
        if not isinstance(spec, dict):
            return None

        intent = spec.get("intent")
        if intent not in ("aggregate", "list"):
            intent = "aggregate"

        metric = spec.get("metric")
        if metric not in ("sum", "avg", "count", "min", "max"):
            metric = "sum"

        raw_filters = spec.get("filters")
        if not isinstance(raw_filters, dict):
            raw_filters = {}

        ftype = raw_filters.get("type")
        category = raw_filters.get("category")
        desc = raw_filters.get("description_contains")
        filters = {
            "type": ftype if ftype in ("expense", "income") else None,
            "category": str(category)[:100] if isinstance(category, str) and category.strip() else None,
            "date_from": cls._parse_spec_date(raw_filters.get("date_from")),
            "date_to": cls._parse_spec_date(raw_filters.get("date_to")),
            "amount_min": cls._parse_spec_amount(raw_filters.get("amount_min")),
            "amount_max": cls._parse_spec_amount(raw_filters.get("amount_max")),
            "description_contains": str(desc)[:100] if isinstance(desc, str) and desc.strip() else None,
        }

        group_by = spec.get("group_by")
        if group_by not in ("category", "type", "month"):
            group_by = None

        sort = spec.get("sort")
        if sort not in ("asc", "desc"):
            sort = None

        try:
            limit = int(spec.get("limit"))
            limit = max(1, min(limit, 200))
        except (TypeError, ValueError):
            limit = None

        return {
            "intent": intent,
            "metric": metric,
            "filters": filters,
            "group_by": group_by,
            "sort": sort,
            "limit": limit,
        }

    @staticmethod
    def _agg_expr(metric: str):
        return {
            "sum": func.sum(Transaction.amount),
            "avg": func.avg(Transaction.amount),
            "min": func.min(Transaction.amount),
            "max": func.max(Transaction.amount),
            "count": func.count(Transaction.id),
        }.get(metric, func.sum(Transaction.amount))

    @staticmethod
    def _reduce(metric: str, values: List[float]) -> float:
        if not values:
            return 0.0
        if metric == "avg":
            return sum(values) / len(values)
        if metric == "min":
            return min(values)
        if metric == "max":
            return max(values)
        if metric == "count":
            return float(len(values))
        return sum(values)

    @classmethod
    def _run_spec(cls, db: Session, user: User, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Build and run a parameterised, user-scoped query from a validated spec."""
        # user_id is ALWAYS injected server-side; the model never controls it.
        q = db.query(Transaction).filter(Transaction.user_id == user.id)

        f = spec["filters"]
        if f["type"]:
            q = q.filter(Transaction.type == f["type"])
        if f["category"]:
            q = q.filter(func.lower(Transaction.category) == f["category"].lower())
        if f["date_from"]:
            q = q.filter(Transaction.date >= f["date_from"])
        if f["date_to"]:
            q = q.filter(Transaction.date <= f["date_to"])
        if f["amount_min"] is not None:
            q = q.filter(Transaction.amount >= f["amount_min"])
        if f["amount_max"] is not None:
            q = q.filter(Transaction.amount <= f["amount_max"])
        if f["description_contains"]:
            q = q.filter(Transaction.description.ilike(f"%{f['description_contains']}%"))

        intent = spec["intent"]
        metric = spec["metric"]
        group_by = spec["group_by"]
        sort = spec["sort"]
        limit = spec["limit"]

        if intent == "list":
            if sort in ("asc", "desc"):
                order_col = Transaction.amount.asc() if sort == "asc" else Transaction.amount.desc()
            else:
                order_col = Transaction.date.desc()
            rows = q.order_by(order_col).limit(limit or 10).all()
            return {"intent": "list", "rows": cls._serialize(rows), "count": len(rows)}

        # aggregate
        if group_by in ("category", "type"):
            col = Transaction.category if group_by == "category" else Transaction.type
            agg = cls._agg_expr(metric)
            rows = (
                q.with_entities(col.label("key"), agg.label("value"), func.count(Transaction.id).label("cnt"))
                .group_by(col)
                .all()
            )
            groups = [
                {"key": r.key, "value": float(r.value or 0), "count": int(r.cnt)} for r in rows
            ]
            groups.sort(key=lambda g: g["value"], reverse=(sort != "asc"))
            if limit:
                groups = groups[:limit]
            return {"intent": "aggregate", "metric": metric, "group_by": group_by, "groups": groups}

        if group_by == "month":
            rows = q.with_entities(Transaction.date, Transaction.amount).all()
            buckets: Dict[str, List[float]] = {}
            for d, amt in rows:
                key = d.strftime("%Y-%m") if d else "unknown"
                buckets.setdefault(key, []).append(float(amt))
            groups = [
                {"key": k, "value": cls._reduce(metric, v), "count": len(v)}
                for k, v in buckets.items()
            ]
            groups.sort(key=lambda g: g["key"])
            return {"intent": "aggregate", "metric": metric, "group_by": "month", "groups": groups}

        value = q.with_entities(cls._agg_expr(metric)).scalar()
        return {
            "intent": "aggregate",
            "metric": metric,
            "value": float(value or 0),
            "count": q.count(),
        }

    @staticmethod
    def _spec_for_prompt(spec: Dict[str, Any]) -> Dict[str, Any]:
        """JSON-safe copy of a spec (dates → ISO strings)."""
        filters = dict(spec["filters"])
        for key in ("date_from", "date_to"):
            if filters.get(key):
                filters[key] = filters[key].isoformat()
        out = dict(spec)
        out["filters"] = filters
        return out

    @staticmethod
    def _inr(value: Any) -> str:
        """Format a number as a tidy INR string (₹ + thousands separators, no .0)."""
        try:
            v = float(value)
        except (TypeError, ValueError):
            return str(value)
        if v == int(v):
            return f"₹{int(v):,}"
        return f"₹{v:,.2f}"

    @classmethod
    def _display_results(cls, results: Dict[str, Any]) -> Dict[str, Any]:
        """Prompt-friendly copy of the result with amounts pre-formatted as ₹ strings."""
        metric = results.get("metric")
        out: Dict[str, Any] = {"intent": results.get("intent")}
        if metric:
            out["metric"] = metric

        if results.get("intent") == "list":
            out["rows"] = [
                {
                    "date": r.get("date"),
                    "amount": cls._inr(r.get("amount")),
                    "type": r.get("type"),
                    "category": r.get("category"),
                    "description": r.get("description", ""),
                }
                for r in results.get("rows", [])
            ]
            out["count"] = results.get("count", 0)
            return out

        if "groups" in results:
            out["group_by"] = results.get("group_by")
            out["groups"] = [
                {
                    "key": g["key"],
                    "amount": int(g["value"]) if metric == "count" else cls._inr(g["value"]),
                    "count": g.get("count"),
                }
                for g in results["groups"]
            ]
            return out

        if metric == "count":
            out["value"] = int(results.get("value", 0))
        else:
            out["amount"] = cls._inr(results.get("value", 0))
        out["count"] = results.get("count", 0)
        return out

    @classmethod
    def _phrase_result(
        cls, question: str, spec: Dict[str, Any], results: Dict[str, Any]
    ) -> Optional[str]:
        """Have the LLM phrase the exact computed result. Numbers are not recomputed."""
        system = (
            "You are a personal-finance assistant. You are given the user's question and "
            "the EXACT result already computed from their data. Write a clear, well-"
            "structured answer in GitHub-flavoured markdown.\n\n"
            "Formatting rules:\n"
            "- Open with one short summary sentence.\n"
            "- For a breakdown or multiple items, use a markdown bullet list ('- '), one "
            "item per line, with the label in **bold** followed by its amount.\n"
            "- Use the pre-formatted amount strings EXACTLY as given (they already include "
            "the ₹ sign and thousands separators) — never reformat, invent, or recompute "
            "numbers.\n"
            "- Do NOT use markdown tables. Use at most one short '### ' heading. Keep it "
            "concise (≈6 lines max).\n"
            "- Do NOT add filler, empty sections, trailing headings, or notes like 'no "
            "additional data'. Stop as soon as the question is answered.\n"
            "- If the result is empty or zero, simply say there is no matching data."
        )
        payload = {
            "question": question,
            "query": cls._spec_for_prompt(spec),
            "result": cls._display_results(results),
        }
        return cls._complete(system, json.dumps(payload, default=str), max_tokens=400)

    @classmethod
    def _format_result(cls, results: Dict[str, Any]) -> str:
        """Deterministic phrasing used when the LLM phrasing step is unavailable."""
        labels = {"sum": "Total", "avg": "Average", "count": "Count", "min": "Lowest", "max": "Highest"}

        if results.get("intent") == "list":
            rows = results.get("rows", [])
            if not rows:
                return "No matching transactions found."
            lines = ["Here are the matching transactions:"]
            for r in rows:
                extra = f" — {r['description']}" if r.get("description") else ""
                lines.append(f"- {r['date']}: **{cls._inr(r['amount'])}** ({r['category']}){extra}")
            return "\n".join(lines)

        metric = results.get("metric", "sum")
        label = labels.get(metric, "Total")

        if "groups" in results:
            groups = results["groups"]
            if not groups:
                return "No matching transactions found."
            lines = [f"**{label} by {results.get('group_by')}:**"]
            for g in groups:
                if metric == "count":
                    lines.append(f"- **{g['key']}**: {int(g['value'])}")
                else:
                    lines.append(f"- **{g['key']}**: {cls._inr(g['value'])}")
            return "\n".join(lines)

        if results.get("count", 0) == 0:
            return "No matching transactions found for that query."
        value = results.get("value", 0)
        if metric == "count":
            return f"{label}: **{int(value)}** transactions."
        return f"{label}: **{cls._inr(value)}** (across {results.get('count', 0)} transactions)."

    @classmethod
    def _finance_summary(cls, db: Session, user: User, days: int = 90) -> Dict[str, Any]:
        """Compact, pre-aggregated snapshot of the user's finances (never raw rows)."""
        txns = cls._recent_transactions(db, user, days=days)
        if not txns:
            return {"period_days": days, "transactions": 0}
        expenses = [t for t in txns if t.type == "expense"]
        income = [t for t in txns if t.type == "income"]
        by_cat: Dict[str, float] = {}
        for t in expenses:
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
        top = sorted(by_cat.items(), key=lambda kv: kv[1], reverse=True)[:5]
        return {
            "period_days": days,
            "transactions": len(txns),
            "total_expense": cls._inr(sum(t.amount for t in expenses)),
            "total_income": cls._inr(sum(t.amount for t in income)),
            "top_expense_categories": [
                {"category": c, "amount": cls._inr(a)} for c, a in top
            ],
        }

    @classmethod
    def _answer_general(
        cls,
        db: Session,
        user: User,
        question: str,
        history: Optional[List[Dict[str, str]]],
    ) -> Optional[str]:
        """Answer questions that aren't structured data queries.

        Understands the user's intent and answers it directly: uses a compact
        finance summary only when relevant, otherwise relies on general financial
        knowledge. Never echoes the supplied context or repeats the question.
        """
        summary = cls._finance_summary(db, user)
        system = (
            "You are a knowledgeable personal-finance assistant. Answer the user's "
            "ACTUAL question directly and helpfully.\n\n"
            "- First work out the user's intent.\n"
            "- A short summary of the user's finances is provided as OPTIONAL context. "
            "Use it only if it is relevant to the question; otherwise ignore it.\n"
            "- If the question is about their own spending/income and the context is "
            "relevant, answer naturally from it — do not dump figures that weren't asked "
            "for.\n"
            "- If the question is general financial advice or a concept, answer from your "
            "own expertise; you do not need their data.\n"
            "- If the question is unrelated to personal finance or their data, briefly note "
            "it's outside the scope of their financial data, then still help with general "
            "knowledge where you reasonably can.\n"
            "- Never echo the context or repeat the question back. Be concise and use "
            "markdown (short paragraphs or bullet lists). Amounts are in INR (₹)."
        )
        messages: List[Dict[str, str]] = []
        for turn in (history or [])[-6:]:
            role = "assistant" if turn.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": str(turn.get("content", ""))})
        messages.append(
            {
                "role": "user",
                "content": (
                    f"Financial summary (optional context): {json.dumps(summary, default=str)}\n\n"
                    f"Question: {question}"
                ),
            }
        )
        text = cls._chat_raw(system, messages, max_tokens=600)
        return cls._tidy_answer(text) if text else None

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
