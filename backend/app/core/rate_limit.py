"""Shared rate limiter (slowapi) with a safe no-op fallback.

If ``slowapi`` isn't installed, ``limit`` becomes a pass-through decorator so the
application continues to function without rate limiting.
"""
from __future__ import annotations

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    RATE_LIMITING_ENABLED = True
except Exception:  # noqa: BLE001
    limiter = None
    RATE_LIMITING_ENABLED = False


def limit(rule: str):
    """Decorator factory that applies a rate limit when slowapi is available."""

    def decorator(func):
        if RATE_LIMITING_ENABLED and limiter is not None:
            return limiter.limit(rule)(func)
        return func

    return decorator
