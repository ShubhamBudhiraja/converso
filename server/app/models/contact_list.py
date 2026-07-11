from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class ContactList(Base):
    __tablename__ = "contact_lists"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name = Column(String, nullable=False)
    first_name_column = Column(String, nullable=False)
    last_name_column = Column(String, nullable=False)
    phone_number_column = Column(String, nullable=False)
    address_column = Column(String, nullable=True)
    second_phone_column = Column(String, nullable=True)
    country_code = Column(String, default="+1", nullable=False)
    total_contacts = Column(Integer, default=0, nullable=False)
    processed_contacts = Column(Integer, default=0, nullable=False)
    failed_contacts = Column(Integer, default=0, nullable=False)
    status = Column(String, default="processing", nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="contact_lists")
    contacts = relationship(
        "Contact", back_populates="contact_list", cascade="all, delete-orphan"
    )
