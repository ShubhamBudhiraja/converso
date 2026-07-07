from sqlalchemy import TIMESTAMP, Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class CallerAgent(Base):
    __tablename__ = "caller_agents"
    __table_args__ = (UniqueConstraint("phone_number_id", name="uq_caller_agent_phone_number"),)

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String, nullable=False)
    twilio_connection_id = Column(
        String,
        ForeignKey("twilio_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    phone_number_id = Column(
        String,
        ForeignKey("phone_numbers.id", ondelete="CASCADE"),
        nullable=False,
    )
    elevenlabs_connection_id = Column(
        String,
        ForeignKey("elevenlabs_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    elevenlabs_agent_id = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="caller_agents")
    twilio_connection = relationship("TwilioConnection")
    phone_number = relationship("PhoneNumber")
    elevenlabs_connection = relationship("ElevenLabsConnection")
