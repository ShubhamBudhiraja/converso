from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.connection import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, index=True)
    contact_list_id = Column(
        String,
        ForeignKey("contact_lists.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=False)
    address = Column(String, nullable=True)
    second_phone_number = Column(String, nullable=True)
    country_code = Column(String, nullable=True)
    row_number = Column(Integer, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    contact_list = relationship("ContactList", back_populates="contacts")
