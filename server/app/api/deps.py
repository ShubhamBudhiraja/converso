from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.cookies import ACCESS_TOKEN_COOKIE
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.models.user import User
from app.services.auth import get_active_session, get_user_by_id

optional_bearer = HTTPBearer(auto_error=False)


def _resolve_access_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    access_token: Optional[str],
) -> str:
    token = access_token or (credentials.credentials if credentials else None)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
    access_token: Optional[str] = Cookie(None, alias=ACCESS_TOKEN_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    token = _resolve_access_token(credentials, access_token)
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    session_id = payload.get("sid")

    if not user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    get_active_session(db, session_id, user_id)
    return get_user_by_id(db, user_id)
