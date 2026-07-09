from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="scheduled", nullable=False)
    caller_agent_id = Column(
        String,
        ForeignKey("caller_agents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    list_ids = Column(Text, nullable=False)
    scheduled_at = Column(TIMESTAMP(timezone=True), nullable=False)
    timezone = Column(String, nullable=False)
    retry_attempts = Column(Integer, default=1, nullable=False)
    retry_interval = Column(String, default="24h", nullable=False)
    started_at = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="campaigns")
    caller_agent = relationship("CallerAgent")
    calls = relationship("Call", back_populates="campaign")
