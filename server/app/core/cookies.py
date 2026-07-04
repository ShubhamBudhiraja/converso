import os
from datetime import timedelta

from fastapi import Response

from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")


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
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")
