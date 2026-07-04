from sqlalchemy import TIMESTAMP, Column, ForeignKey, String
from sqlalchemy.sql import func

from app.database.connection import Base


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), default=func.now())
    expires_at = Column(TIMESTAMP, nullable=False)
    used_at = Column(TIMESTAMP, nullable=True)
