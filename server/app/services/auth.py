import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    FRONTEND_URL,
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    password_reset_expires_at,
    refresh_token_expires_at,
    verify_password,
)
from app.models.password_reset import PasswordResetToken
from app.models.session import Session as UserSession
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin

logger = logging.getLogger(__name__)


def _issue_tokens(
    db: Session,
    user: User,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> TokenResponse:
    refresh_token = generate_opaque_token()
    session = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        refresh_token_hash=hash_token(refresh_token),
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=refresh_token_expires_at(),
    )
    db.add(session)
    db.commit()

    access_token = create_access_token(user.id, session.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def create_user(db: Session, user: UserCreate) -> TokenResponse:
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        email=user.email,
        password=hash_password(user.password),
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    return _issue_tokens(db, new_user)


def authenticate_user(
    db: Session,
    user: UserLogin,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> TokenResponse:
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return _issue_tokens(db, db_user, user_agent=user_agent, ip_address=ip_address)


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    token_hash = hash_token(refresh_token)
    now = datetime.now(timezone.utc)

    session = (
        db.query(UserSession)
        .filter(
            UserSession.refresh_token_hash == token_hash,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(user.id, session.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def logout(db: Session, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    session = (
        db.query(UserSession)
        .filter(UserSession.refresh_token_hash == token_hash)
        .first()
    )

    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()


def request_password_reset(db: Session, email: str) -> str:
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return "If an account exists for that email, a reset link has been sent"

    raw_token = generate_opaque_token()
    reset_token = PasswordResetToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=password_reset_expires_at(),
    )
    db.add(reset_token)
    db.commit()

    reset_url = f"{FRONTEND_URL}/reset-password?token={raw_token}"
    logger.info("Password reset link for %s: %s", email, reset_url)

    return "If an account exists for that email, a reset link has been sent"


def reset_password(db: Session, token: str, new_password: str) -> str:
    token_hash = hash_token(token)
    now = datetime.now(timezone.utc)

    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.password = hash_password(new_password)
    reset_token.used_at = now

    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None),
    ).update({"revoked_at": now})

    db.commit()

    return "Password reset successfully. Please log in again."


def get_user_by_id(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def get_active_session(db: Session, session_id: str, user_id: str) -> UserSession:
    now = datetime.now(timezone.utc)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked",
        )

    return session
