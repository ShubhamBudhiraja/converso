from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CreateCallerAgentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    twilio_connection_id: str = Field(min_length=1)
    phone_number_id: str = Field(min_length=1)
    elevenlabs_connection_id: str = Field(min_length=1)
    elevenlabs_agent_id: str = Field(min_length=1)


class CallerAgentResponse(BaseModel):
    id: str
    name: str
    twilio_connection_id: str
    twilio_connection_label: Optional[str] = None
    phone_number_id: str
    phone_number: str
    phone_label: Optional[str] = None
    elevenlabs_connection_id: str
    elevenlabs_connection_label: Optional[str] = None
    elevenlabs_agent_id: str
    elevenlabs_agent_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
