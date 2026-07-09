from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Call(Base):
    __tablename__ = "calls"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    campaign_id = Column(
        String,
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    contact_id = Column(
        String,
        ForeignKey("contacts.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    caller_agent_id = Column(
        String,
        ForeignKey("caller_agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    phone_number = Column(String, nullable=False)
    direction = Column(String, default="outbound", nullable=False)
    status = Column(String, default="pending", nullable=False)
    call_sid = Column(String, nullable=True, index=True)
    conversation_id = Column(String, nullable=True, index=True)
    transcription_summary = Column(Text, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    provider_metadata = Column(Text, nullable=True)
    retry_attempt = Column(Integer, default=1, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="calls")
    campaign = relationship("Campaign", back_populates="calls")
    contact = relationship("Contact")
