from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.phone import BulkDeleteRequest, BulkDeleteResponse, MessageResponse

__all__ = [
    "BulkDeleteRequest",
    "BulkDeleteResponse",
    "CreateElevenLabsAgentRequest",
    "ElevenLabsAgentDetailResponse",
    "ElevenLabsAgentResponse",
    "ElevenLabsConnectionResponse",
    "ElevenLabsCredentialsRequest",
    "ElevenLabsTestRequest",
    "ElevenLabsTestResponse",
    "ElevenLabsVoiceResponse",
    "MessageResponse",
    "UpdateElevenLabsAgentRequest",
    "UpdateElevenLabsConnectionRequest",
]


class ElevenLabsCredentialsRequest(BaseModel):
    api_key: str = Field(min_length=10, max_length=256)
    label: Optional[str] = Field(default=None, max_length=100)


class UpdateElevenLabsConnectionRequest(BaseModel):
    label: Optional[str] = Field(default=None, max_length=100)


class ElevenLabsConnectionResponse(BaseModel):
    id: str
    api_key_masked: str
    label: Optional[str]
    is_valid: bool
    last_tested_at: Optional[datetime]
    agent_count: int = 0
    created_at: datetime
    updated_at: datetime


class ElevenLabsTestRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, min_length=10, max_length=256)


class ElevenLabsTestResponse(BaseModel):
    success: bool
    message: str
    subscription_tier: Optional[str] = None
    character_count: Optional[int] = None
    character_limit: Optional[int] = None


class ElevenLabsAgentResponse(BaseModel):
    agent_id: str
    name: str
    created_at_unix_secs: Optional[int] = None


class ElevenLabsAgentDetailResponse(ElevenLabsAgentResponse):
    system_prompt: Optional[str] = None
    first_message: Optional[str] = None
    voice_id: Optional[str] = None
    llm: Optional[str] = None


class ElevenLabsVoiceResponse(BaseModel):
    voice_id: str
    name: str
    language: str
    gender: str
    accent: Optional[str] = None
    description: Optional[str] = None


class CreateElevenLabsAgentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    system_prompt: str = Field(default="You are a helpful assistant.", max_length=8000)
    first_message: str = Field(default="Hello! How can I help you today?", max_length=1000)
    voice_id: str = Field(min_length=1, max_length=64)
    llm: str = Field(default="gpt-4o-mini", max_length=64)


class UpdateElevenLabsAgentRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    system_prompt: Optional[str] = Field(default=None, max_length=8000)
    first_message: Optional[str] = Field(default=None, max_length=1000)
    voice_id: Optional[str] = Field(default=None, max_length=64)
    llm: Optional[str] = Field(default=None, max_length=64)
