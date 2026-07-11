import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.call import Call
from app.models.campaign import Campaign
from app.models.contact import Contact

TERMINAL_CALL_STATUSES = {
    "completed",
    "failed",
    "busy",
    "no_answer",
    "cancelled",
}

TWILIO_STATUS_MAP = {
    "queued": "initiated",
    "initiated": "initiated",
    "ringing": "ringing",
    "in-progress": "in_progress",
    "answered": "answered",
    "completed": "completed",
    "busy": "busy",
    "no-answer": "no_answer",
    "failed": "failed",
    "canceled": "cancelled",
    "cancelled": "cancelled",
}


def map_twilio_status(raw_status: str) -> str:
    return TWILIO_STATUS_MAP.get(raw_status.lower(), raw_status.lower())


def _parse_metadata(call: Call) -> dict[str, Any]:
    if not call.provider_metadata:
        return {}
    try:
        return json.loads(call.provider_metadata)
    except json.JSONDecodeError:
        return {}


def _save_metadata(call: Call, metadata: dict[str, Any]) -> None:
    call.provider_metadata = json.dumps(metadata)


def get_call_by_sid(db: Session, call_sid: str) -> Optional[Call]:
    return db.query(Call).filter(Call.call_sid == call_sid).first()


def get_call_by_conversation_id(db: Session, conversation_id: str) -> Optional[Call]:
    return db.query(Call).filter(Call.conversation_id == conversation_id).first()


def update_call_from_twilio_status(
    db: Session,
    *,
    call_sid: str,
    raw_status: str,
    duration: Optional[int] = None,
    raw_payload: Optional[dict[str, Any]] = None,
) -> Optional[Call]:
    call = get_call_by_sid(db, call_sid)
    if not call:
        return None

    mapped_status = map_twilio_status(raw_status)
    call.status = mapped_status
    if duration is not None:
        call.duration_seconds = duration

    metadata = _parse_metadata(call)
    metadata["twilio_status"] = raw_payload or {}
    _save_metadata(call, metadata)
    call.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(call)
    maybe_complete_campaign(db, call.campaign_id)

    if call.status in TERMINAL_CALL_STATUSES:
        from app.services.leads import create_or_update_lead_from_call

        create_or_update_lead_from_call(db, call)

    return call


def update_call_from_elevenlabs_post_call(
    db: Session,
    *,
    conversation_id: str,
    agent_id: Optional[str],
    transcript_summary: Optional[str],
    call_duration_secs: Optional[int],
    raw_payload: Optional[dict[str, Any]] = None,
) -> Optional[Call]:
    call = get_call_by_conversation_id(db, conversation_id)
    if not call and agent_id:
        call = (
            db.query(Call)
            .filter(
                Call.conversation_id.is_(None),
                Call.status.in_(["initiated", "ringing", "in_progress"]),
            )
            .order_by(Call.created_at.desc())
            .first()
        )

    if not call:
        return None

    if conversation_id and not call.conversation_id:
        call.conversation_id = conversation_id

    if transcript_summary:
        call.transcription_summary = transcript_summary
    if call_duration_secs is not None:
        call.duration_seconds = call_duration_secs

    if call.status not in TERMINAL_CALL_STATUSES:
        call.status = "completed"

    metadata = _parse_metadata(call)
    metadata["elevenlabs_post_call"] = raw_payload or {}
    _save_metadata(call, metadata)
    call.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(call)
    maybe_complete_campaign(db, call.campaign_id)

    from app.services.leads import create_or_update_lead_from_call

    create_or_update_lead_from_call(db, call)

    return call


def _call_is_finished(call: Call) -> bool:
    if call.status in TERMINAL_CALL_STATUSES:
        return True
    if call.transcription_summary:
        return True
    return False


def maybe_complete_campaign(db: Session, campaign_id: str) -> None:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.status != "running":
        return

    list_ids = json.loads(campaign.list_ids)
    total_contacts = (
        db.query(Contact).filter(Contact.contact_list_id.in_(list_ids)).count()
    )
    if total_contacts == 0:
        return

    calls = db.query(Call).filter(Call.campaign_id == campaign_id).all()
    if len(calls) < total_contacts:
        return
    if all(_call_is_finished(call) for call in calls):
        campaign.status = "completed"
        campaign.completed_at = datetime.now(timezone.utc)
        db.commit()


def get_campaign_call_stats(db: Session, campaign_id: str) -> dict[str, int]:
    calls = db.query(Call).filter(Call.campaign_id == campaign_id).all()
    return {
        "calls_initiated": len(calls),
        "calls_completed": sum(1 for call in calls if call.status == "completed"),
        "calls_failed": sum(
            1
            for call in calls
            if call.status in {"failed", "busy", "no_answer", "cancelled"}
        ),
    }
