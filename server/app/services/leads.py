import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.call import Call
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadResponse, LeadStatisticsResponse
from app.schemas.pagination import PaginatedResponse, slice_page

logger = logging.getLogger(__name__)

TERMINAL_CALL_STATUSES = {
    "completed",
    "failed",
    "busy",
    "no_answer",
    "cancelled",
}

CALL_STATUS_TO_LEAD_STATUS = {
    "answered": "new_lead",
    "completed": "new_lead",
    "no_answer": "voicemail",
    "busy": "dead",
    "failed": "dead",
    "cancelled": "dead",
}


def build_transcript_from_webhook_payload(data: dict[str, Any]) -> Optional[str]:
    analysis = data.get("analysis") or {}
    summary = analysis.get("transcript_summary")
    if summary and str(summary).strip():
        return str(summary).strip()

    transcript_entries = data.get("transcript") or []
    if not transcript_entries:
        return None

    lines: list[str] = []
    for entry in transcript_entries:
        if not isinstance(entry, dict):
            continue
        role = entry.get("role") or "unknown"
        message = entry.get("message") or entry.get("text") or ""
        if message:
            lines.append(f"{role}: {message}")

    if not lines:
        return None
    return "\n".join(lines)


def map_call_status_to_lead_status(call_status: str) -> str:
    return CALL_STATUS_TO_LEAD_STATUS.get(call_status, "dead")


def build_call_summary(call: Call) -> str:
    if call.transcription_summary and call.transcription_summary.strip():
        return call.transcription_summary.strip()
    return f"Outbound call ended with status: {call.status.replace('_', ' ')}"


def _parse_metadata(call: Call) -> dict:
    if not call.provider_metadata:
        return {}
    try:
        return json.loads(call.provider_metadata)
    except json.JSONDecodeError:
        return {}


def _lead_response(db: Session, lead: Lead) -> LeadResponse:
    campaign_name = None
    contact_name = None
    phone_number = None

    if lead.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
        campaign_name = campaign.name if campaign else None
    if lead.contact_id:
        contact = db.query(Contact).filter(Contact.id == lead.contact_id).first()
        if contact:
            contact_name = (
                " ".join(
                    part for part in [contact.first_name, contact.last_name] if part
                )
                or None
            )
            phone_number = contact.phone_number
    if not phone_number and lead.call_id:
        call = db.query(Call).filter(Call.id == lead.call_id).first()
        phone_number = call.phone_number if call else None

    return LeadResponse(
        id=lead.id,
        user_id=lead.user_id,
        source=lead.source,
        call_id=lead.call_id,
        campaign_id=lead.campaign_id,
        campaign_name=campaign_name,
        contact_id=lead.contact_id,
        contact_name=contact_name,
        phone_number=phone_number,
        status=lead.status,
        confidence=float(lead.confidence or 0),
        summary=lead.summary,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


def _get_lead_or_404(db: Session, user_id: str, lead_id: str) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == user_id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found"
        )
    return lead


def create_or_update_lead_from_call(db: Session, call: Call) -> Optional[Lead]:
    if call.status not in TERMINAL_CALL_STATUSES:
        return None

    campaign = (
        db.query(Campaign).filter(Campaign.id == call.campaign_id).first()
        if call.campaign_id
        else None
    )
    caller_agent_name = None
    if call.caller_agent_id:
        from app.models.caller_agent import CallerAgent

        caller_agent = (
            db.query(CallerAgent).filter(CallerAgent.id == call.caller_agent_id).first()
        )
        caller_agent_name = caller_agent.name if caller_agent else None

    lead_status = map_call_status_to_lead_status(call.status)
    summary = build_call_summary(call)
    metadata = {
        "campaign_name": campaign.name if campaign else None,
        "caller_agent_name": caller_agent_name,
        "phone_number": call.phone_number,
        "call_status": call.status,
        "original_call_duration": call.duration_seconds,
        "source": "call_status",
    }

    existing = db.query(Lead).filter(Lead.call_id == call.id).first()
    if existing:
        existing.status = lead_status
        existing.summary = summary
        existing.metadata_json = json.dumps(metadata)
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    lead = Lead(
        id=str(uuid.uuid4()),
        user_id=call.user_id,
        source="outbound" if call.direction == "outbound" else "inbound",
        call_id=call.id,
        campaign_id=call.campaign_id,
        contact_id=call.contact_id,
        status=lead_status,
        confidence=Decimal("0"),
        summary=summary,
        metadata_json=json.dumps(metadata),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    logger.info("Created lead %s from call %s (%s)", lead.id, call.id, call.status)
    return lead


def list_leads(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    status_filter: Optional[str] = None,
    campaign_id: Optional[str] = None,
) -> PaginatedResponse[LeadResponse]:
    query = (
        db.query(Lead).filter(Lead.user_id == user.id).order_by(Lead.created_at.desc())
    )
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    if campaign_id:
        query = query.filter(Lead.campaign_id == campaign_id)

    all_leads = query.all()
    items, total = slice_page(all_leads, page, page_size)
    return PaginatedResponse(
        items=[_lead_response(db, item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_lead(db: Session, user: User, lead_id: str) -> LeadResponse:
    return _lead_response(db, _get_lead_or_404(db, user.id, lead_id))


def get_lead_statistics(
    db: Session,
    user: User,
    campaign_id: Optional[str] = None,
) -> LeadStatisticsResponse:
    query = db.query(Lead).filter(Lead.user_id == user.id)
    if campaign_id:
        query = query.filter(Lead.campaign_id == campaign_id)

    leads = query.all()
    total_leads = len(leads)

    leads_by_status: dict[str, int] = {}
    leads_by_source: dict[str, int] = {}
    for lead in leads:
        leads_by_status[lead.status] = leads_by_status.get(lead.status, 0) + 1
        leads_by_source[lead.source] = leads_by_source.get(lead.source, 0) + 1

    new_lead_count = leads_by_status.get("new_lead", 0)
    conversion_rate = (new_lead_count / total_leads) if total_leads else 0.0

    over_time_query = db.query(
        func.date(Lead.created_at).label("date"),
        func.count(Lead.id).label("count"),
    ).filter(Lead.user_id == user.id)
    if campaign_id:
        over_time_query = over_time_query.filter(Lead.campaign_id == campaign_id)
    over_time_rows = (
        over_time_query.group_by(func.date(Lead.created_at))
        .order_by(func.date(Lead.created_at).asc())
        .all()
    )

    return LeadStatisticsResponse(
        total_leads=total_leads,
        leads_by_status=leads_by_status,
        leads_by_source=leads_by_source,
        conversion_rate=round(conversion_rate, 4),
        average_confidence=0.0,
        leads_over_time=[
            {"date": str(row.date), "count": int(row.count)} for row in over_time_rows
        ],
    )
