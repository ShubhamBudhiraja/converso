from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

ContactListStatus = Literal["processing", "completed", "failed"]
CampaignStatus = Literal["scheduled", "running", "completed", "failed", "cancelled"]
RetryInterval = Literal["24h", "48h", "72h"]
CallStatus = Literal[
    "pending",
    "initiated",
    "ringing",
    "in_progress",
    "answered",
    "completed",
    "failed",
    "busy",
    "no_answer",
    "cancelled",
]


class ImportContactListRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    first_name_column: str = Field(min_length=1, max_length=100)
    last_name_column: str = Field(min_length=1, max_length=100)
    phone_number_column: str = Field(min_length=1, max_length=100)
    address_column: Optional[str] = Field(default=None, max_length=100)
    second_phone_column: Optional[str] = Field(default=None, max_length=100)
    country_code: str = Field(default="+1", max_length=4)


class UpdateContactListRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ContactListImportErrorGroup(BaseModel):
    label: str
    rows: list[int]


class ContactListValidationResponse(BaseModel):
    valid_count: int
    total_rows: int
    error_groups: list[ContactListImportErrorGroup]
    can_import_partial: bool


class ContactListResponse(BaseModel):
    id: str
    name: str
    first_name_column: str
    last_name_column: str
    phone_number_column: str
    address_column: Optional[str]
    second_phone_column: Optional[str]
    country_code: str
    total_contacts: int
    processed_contacts: int
    failed_contacts: int
    status: ContactListStatus
    created_at: datetime
    updated_at: datetime


class ContactResponse(BaseModel):
    id: str
    contact_list_id: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: str
    address: Optional[str]
    second_phone_number: Optional[str]
    country_code: Optional[str]
    row_number: Optional[int]
    created_at: datetime


class ScheduleSettingsRequest(BaseModel):
    timezone: str = Field(min_length=1, max_length=100)
    retry_attempts: int = Field(default=1, ge=1, le=10)
    retry_interval: RetryInterval = "24h"


class CreateCampaignRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    caller_agent_id: str
    list_ids: list[str] = Field(min_length=1)
    scheduled_at: datetime
    schedule_settings: ScheduleSettingsRequest


class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    caller_agent_id: Optional[str] = None
    list_ids: Optional[list[str]] = Field(default=None, min_length=1)
    scheduled_at: Optional[datetime] = None
    schedule_settings: Optional[ScheduleSettingsRequest] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    status: CampaignStatus
    caller_agent_id: str
    caller_agent_name: Optional[str] = None
    list_ids: list[str]
    list_names: list[str] = []
    scheduled_at: datetime
    timezone: str
    retry_attempts: int
    retry_interval: RetryInterval
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_contacts: int = 0
    calls_initiated: int = 0
    calls_completed: int = 0
    calls_failed: int = 0
    created_at: datetime
    updated_at: datetime


class CallResponse(BaseModel):
    id: str
    campaign_id: str
    contact_id: Optional[str]
    contact_name: Optional[str] = None
    phone_number: str
    direction: str
    status: CallStatus
    call_sid: Optional[str]
    conversation_id: Optional[str]
    transcription_summary: Optional[str]
    duration_seconds: Optional[int]
    error_message: Optional[str]
    retry_attempt: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignExecutionResponse(BaseModel):
    success: bool
    total_contacts: int
    calls_initiated: int
    errors: list[str]
