from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.cookies import (
    REFRESH_TOKEN_COOKIE,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    LogoutRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth import (
    authenticate_user,
    create_user,
    logout,
    refresh_access_token,
    request_password_reset,
    reset_password,
)

router = APIRouter()


def _resolve_refresh_token(
    cookie_token: Optional[str],
    body: Optional[RefreshTokenRequest],
) -> Optional[str]:
    if cookie_token:
        return cookie_token
    if body and body.refresh_token:
        return body.refresh_token
    return None


@router.post("/signup", response_model=MessageResponse, status_code=201)
def signup(
    user: UserCreate,
    response: Response,
    db: Session = Depends(get_db),
):
    tokens = create_user(db, user)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return MessageResponse(message="Account created successfully")


@router.post("/login", response_model=MessageResponse)
def login(
    user: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    tokens = authenticate_user(
        db,
        user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return MessageResponse(message="Logged in successfully")


@router.post("/refresh", response_model=MessageResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
    body: Optional[RefreshTokenRequest] = None,
):
    token = _resolve_refresh_token(refresh_token, body)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    tokens = refresh_access_token(db, token)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)
    return MessageResponse(message="Token refreshed successfully")


@router.post("/logout", response_model=MessageResponse)
def logout_user(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
    body: Optional[LogoutRequest] = None,
):
    token = refresh_token or (body.refresh_token if body else None)
    if token:
        logout(db, token)
    clear_auth_cookies(response)
    return MessageResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    message = request_password_reset(db, body.email)
    return MessageResponse(message=message)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_route(
    body: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    message = reset_password(db, body.token, body.password)
    clear_auth_cookies(response)
    return MessageResponse(message=message)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
