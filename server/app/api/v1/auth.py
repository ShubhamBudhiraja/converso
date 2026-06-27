from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserCreate, UserLogin
from app.services.auth import create_user, authenticate_user

router = APIRouter()


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):

    return create_user(db, user)


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    return authenticate_user(db, user)
