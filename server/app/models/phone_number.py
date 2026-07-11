from sqlalchemy import TIMESTAMP, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class PhoneNumber(Base):
    __tablename__ = "phone_numbers"
    __table_args__ = (
        UniqueConstraint("user_id", "phone_number", name="uq_user_phone_number"),
    )

    id = Column(String, primary_key=True, index=True)
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    twilio_connection_id = Column(
        String,
        ForeignKey("twilio_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    phone_number = Column(String, nullable=False)
    twilio_phone_sid = Column(String, nullable=True)
    label = Column(String, nullable=True)
    elevenlabs_phone_number_id = Column(String, nullable=True)
    elevenlabs_connection_id = Column(
        String,
        ForeignKey("elevenlabs_connections.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String, default="active", nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="phone_numbers")
    twilio_connection = relationship("TwilioConnection", back_populates="phone_numbers")
    elevenlabs_connection = relationship(
        "ElevenLabsConnection", back_populates="phone_numbers"
    )
