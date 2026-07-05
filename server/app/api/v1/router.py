from fastapi import APIRouter

from app.api.v1 import auth, phone


api_router = APIRouter()


api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(phone.router, prefix="/phone", tags=["Phone"])
