from sqlalchemy import TIMESTAMP, Column, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source = Column(String, default="outbound", nullable=False)
    call_id = Column(
        String,
        ForeignKey("calls.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
        unique=True,
    )
    campaign_id = Column(
        String,
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    contact_id = Column(
        String,
        ForeignKey("contacts.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status = Column(String, nullable=False)
    confidence = Column(Numeric(3, 2), default=0, nullable=False)
    summary = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="leads")
    call = relationship("Call")
    campaign = relationship("Campaign")
    contact = relationship("Contact")
