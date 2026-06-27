from datetime import datetime
from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
