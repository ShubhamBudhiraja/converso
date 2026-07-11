from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

LeadStatus = Literal["new_lead", "voicemail", "dead"]
LeadSource = Literal["outbound", "inbound"]


class LeadResponse(BaseModel):
    id: str
    user_id: str
    source: LeadSource
    call_id: Optional[str]
    campaign_id: Optional[str]
    campaign_name: Optional[str] = None
    contact_id: Optional[str]
    contact_name: Optional[str] = None
    phone_number: Optional[str] = None
    status: LeadStatus
    confidence: float
    summary: str
    created_at: datetime
    updated_at: datetime


class LeadStatisticsResponse(BaseModel):
    total_leads: int
    leads_by_status: dict[str, int]
    leads_by_source: dict[str, int]
    conversion_rate: float
    average_confidence: float
    leads_over_time: list[dict[str, Any]]


class AnalyzeCallResponse(BaseModel):
    success: bool
    message: str
    call_id: str
    lead_created: bool
    lead_id: Optional[str] = None
