from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class ElevenLabsConnection(Base):
    __tablename__ = "elevenlabs_connections"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    api_key_encrypted = Column(String, nullable=False)
    label = Column(String, nullable=True)
    is_valid = Column(Boolean, default=False, nullable=False)
    last_tested_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="elevenlabs_connections")
    phone_numbers = relationship(
        "PhoneNumber",
        back_populates="elevenlabs_connection",
    )
