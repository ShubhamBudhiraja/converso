from sqlalchemy import TIMESTAMP, Column, String
from sqlalchemy.sql import func
from app.database.connection import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now(), default=func.now())
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), default=func.now(), onupdate=func.now()
    )
