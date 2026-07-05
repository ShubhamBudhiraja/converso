from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class TwilioConnection(Base):
    __tablename__ = "twilio_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "account_sid", name="uq_user_twilio_account_sid"),
    )

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    account_sid = Column(String, nullable=False)
    auth_token_encrypted = Column(String, nullable=False)
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

    user = relationship("User", backref="twilio_connections")
    phone_numbers = relationship(
        "PhoneNumber",
        back_populates="twilio_connection",
        cascade="all, delete-orphan",
    )
