import os
from datetime import timedelta

from fastapi import Response

from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    FRONTEND_URL,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

_frontend_is_https = FRONTEND_URL.startswith("https://")
COOKIE_SECURE = (
    os.getenv("COOKIE_SECURE", "true" if _frontend_is_https else "false").lower()
    == "true"
)

_samesite_env = os.getenv("COOKIE_SAMESITE")
if _samesite_env:
    COOKIE_SAMESITE = _samesite_env.lower()
elif os.getenv("CROSS_ORIGIN_AUTH", "false").lower() == "true":
    COOKIE_SAMESITE = "none"
else:
    COOKIE_SAMESITE = "lax"

if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    COOKIE_SECURE = True


def _set_cookie(response: Response, key: str, value: str, max_age: int) -> None:
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=max_age,
        path="/",
    )


def set_auth_cookies(
    response: Response, access_token: str, refresh_token: str
) -> None:
    _set_cookie(
        response,
        ACCESS_TOKEN_COOKIE,
        access_token,
        ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    _set_cookie(
        response,
        REFRESH_TOKEN_COOKIE,
        refresh_token,
        int(timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()),
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        ACCESS_TOKEN_COOKIE,
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    response.delete_cookie(
        REFRESH_TOKEN_COOKIE,
        path="/",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
