from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class TwilioCredentialsRequest(BaseModel):
    account_sid: str = Field(min_length=10, max_length=64)
    auth_token: str = Field(min_length=10, max_length=128)
    label: Optional[str] = Field(default=None, max_length=100)


class UpdateTwilioConnectionRequest(BaseModel):
    auth_token: Optional[str] = Field(default=None, min_length=10, max_length=128)
    label: Optional[str] = Field(default=None, max_length=100)


class TwilioConnectionResponse(BaseModel):
    id: str
    account_sid_masked: str
    auth_token_masked: str
    label: Optional[str]
    is_valid: bool
    last_tested_at: Optional[datetime]
    phone_number_count: int = 0
    created_at: datetime
    updated_at: datetime


class TwilioTestRequest(BaseModel):
    account_sid: Optional[str] = Field(default=None, min_length=10, max_length=64)
    auth_token: Optional[str] = Field(default=None, min_length=10, max_length=128)


class TwilioTestResponse(BaseModel):
    success: bool
    message: str
    account_friendly_name: Optional[str] = None


class TwilioAccountNumberResponse(BaseModel):
    sid: str
    phone_number: str
    friendly_name: Optional[str] = None
    voice_enabled: bool = False
    sms_enabled: bool = False


class TwilioAvailableNumberResponse(BaseModel):
    phone_number: str
    friendly_name: Optional[str] = None
    locality: Optional[str] = None
    region: Optional[str] = None
    country_code: str
    voice_enabled: bool = False
    sms_enabled: bool = False
    mms_enabled: bool = False


class SavePhoneNumberRequest(BaseModel):
    twilio_connection_id: str = Field(min_length=1)
    phone_number: str = Field(
        min_length=8,
        max_length=20,
        pattern=r"^\+[1-9]\d{1,14}$",
        description="Phone number in E.164 format",
    )
    label: str = Field(min_length=1, max_length=100)


class PurchasePhoneNumberRequest(BaseModel):
    twilio_connection_id: str = Field(min_length=1)
    phone_number: str = Field(
        min_length=8,
        max_length=20,
        pattern=r"^\+[1-9]\d{1,14}$",
        description="Phone number in E.164 format to purchase from Twilio",
    )
    label: str = Field(min_length=1, max_length=100)


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=100)


class BulkDeleteResponse(BaseModel):
    deleted_count: int
    not_found_ids: list[str] = Field(default_factory=list)


NumberType = Literal["local", "toll_free", "mobile"]


class PhoneNumberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    twilio_connection_id: str
    phone_number: str
    twilio_phone_sid: Optional[str]
    label: Optional[str]
    status: str
    elevenlabs_phone_number_id: Optional[str]
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
