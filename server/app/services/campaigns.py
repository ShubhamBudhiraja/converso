import json
import logging
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session, joinedload

from app.database.connection import SessionLocal
from app.models.call import Call
from app.models.caller_agent import CallerAgent
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.contact_list import ContactList
from app.models.user import User
from app.schemas.campaign import (
    CampaignResponse,
    CreateCampaignRequest,
    UpdateCampaignRequest,
)
from app.schemas.pagination import PaginatedResponse, slice_page
from app.services.call_lifecycle import get_campaign_call_stats
from app.services.campaign_execution import execute_campaign

logger = logging.getLogger(__name__)

CAMPAIGN_EDIT_LOCK_MINUTES = 5

_execution_guard = threading.Lock()
_active_campaign_executions: set[str] = set()


def _parse_list_ids(raw: str) -> list[str]:
    return json.loads(raw)


def _scheduled_at_utc(campaign: Campaign) -> datetime:
    scheduled_at = campaign.scheduled_at
    if scheduled_at.tzinfo is None:
        try:
            local_tz = ZoneInfo(campaign.timezone)
            scheduled_at = scheduled_at.replace(tzinfo=local_tz)
        except Exception:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    return scheduled_at.astimezone(timezone.utc)


def _normalize_scheduled_at(scheduled_at: datetime) -> datetime:
    if scheduled_at.tzinfo is None:
        return scheduled_at.replace(tzinfo=timezone.utc)
    return scheduled_at.astimezone(timezone.utc)


def _assert_campaign_editable(campaign: Campaign) -> None:
    if campaign.status == "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This campaign is running. You cannot edit it anymore.",
        )
    if campaign.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled campaigns can be updated",
        )

    now = datetime.now(timezone.utc)
    scheduled_at = _scheduled_at_utc(campaign)
    lock_at = scheduled_at - timedelta(minutes=CAMPAIGN_EDIT_LOCK_MINUTES)

    if now >= scheduled_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This campaign is running. You cannot edit it anymore.",
        )
    if now >= lock_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaigns cannot be edited within 5 minutes of the scheduled start time.",
        )


def _validate_new_scheduled_at(scheduled_at: datetime) -> datetime:
    normalized = _normalize_scheduled_at(scheduled_at)
    now = datetime.now(timezone.utc)
    minimum_start = now + timedelta(minutes=CAMPAIGN_EDIT_LOCK_MINUTES)
    if normalized < minimum_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled start must be at least 5 minutes from now.",
        )
    return normalized


def _campaign_response(db: Session, campaign: Campaign) -> CampaignResponse:
    list_ids = _parse_list_ids(campaign.list_ids)
    lists = db.query(ContactList).filter(ContactList.id.in_(list_ids)).all()
    list_name_map = {item.id: item.name for item in lists}
    total_contacts = (
        db.query(Contact).filter(Contact.contact_list_id.in_(list_ids)).count()
        if list_ids
        else 0
    )
    stats = get_campaign_call_stats(db, campaign.id)
    caller_agent_name = campaign.caller_agent.name if campaign.caller_agent else None

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        status=campaign.status,
        caller_agent_id=campaign.caller_agent_id,
        caller_agent_name=caller_agent_name,
        list_ids=list_ids,
        list_names=[list_name_map.get(list_id, list_id) for list_id in list_ids],
        scheduled_at=campaign.scheduled_at,
        timezone=campaign.timezone,
        retry_attempts=campaign.retry_attempts,
        retry_interval=campaign.retry_interval,
        started_at=campaign.started_at,
        completed_at=campaign.completed_at,
        total_contacts=total_contacts,
        calls_initiated=stats["calls_initiated"],
        calls_completed=stats["calls_completed"],
        calls_failed=stats["calls_failed"],
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _get_campaign_or_404(db: Session, user_id: str, campaign_id: str) -> Campaign:
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.caller_agent))
        .filter(Campaign.id == campaign_id, Campaign.user_id == user_id)
        .first()
    )
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found"
        )
    return campaign


def _validate_lists(db: Session, user_id: str, list_ids: list[str]) -> None:
    lists = (
        db.query(ContactList)
        .filter(ContactList.id.in_(list_ids), ContactList.user_id == user_id)
        .all()
    )
    if len(lists) != len(list_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more contact lists were not found",
        )
    invalid = [
        item.id
        for item in lists
        if item.status != "completed" or item.total_contacts == 0
    ]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All selected contact lists must be completed with at least one contact",
        )


def _validate_caller_agent(
    db: Session, user_id: str, caller_agent_id: str
) -> CallerAgent:
    caller_agent = (
        db.query(CallerAgent)
        .options(joinedload(CallerAgent.phone_number))
        .filter(CallerAgent.id == caller_agent_id, CallerAgent.user_id == user_id)
        .first()
    )
    if not caller_agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Caller agent not found"
        )
    if (
        not caller_agent.phone_number
        or not caller_agent.phone_number.elevenlabs_phone_number_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caller agent phone is not registered with ElevenLabs",
        )
    return caller_agent


def list_campaigns(
    db: Session,
    user: User,
    page: int,
    page_size: int,
) -> PaginatedResponse[CampaignResponse]:
    query = (
        db.query(Campaign)
        .options(joinedload(Campaign.caller_agent))
        .filter(Campaign.user_id == user.id)
        .order_by(Campaign.created_at.desc())
    )
    all_campaigns = query.all()
    items, total = slice_page(all_campaigns, page, page_size)
    return PaginatedResponse(
        items=[_campaign_response(db, item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_campaign(db: Session, user: User, campaign_id: str) -> CampaignResponse:
    return _campaign_response(db, _get_campaign_or_404(db, user.id, campaign_id))


def list_campaign_calls(
    db: Session,
    user: User,
    campaign_id: str,
    page: int,
    page_size: int,
) -> PaginatedResponse:
    from app.schemas.campaign import CallResponse

    campaign = _get_campaign_or_404(db, user.id, campaign_id)
    query = (
        db.query(Call)
        .options(joinedload(Call.contact))
        .filter(Call.campaign_id == campaign.id)
        .order_by(Call.created_at.desc())
    )
    all_calls = query.all()
    items, total = slice_page(all_calls, page, page_size)

    def to_response(call: Call) -> CallResponse:
        contact_name = None
        if call.contact:
            contact_name = (
                " ".join(
                    part
                    for part in [call.contact.first_name, call.contact.last_name]
                    if part
                )
                or None
            )
        return CallResponse(
            id=call.id,
            campaign_id=call.campaign_id,
            contact_id=call.contact_id,
            contact_name=contact_name,
            phone_number=call.phone_number,
            direction=call.direction,
            status=call.status,
            call_sid=call.call_sid,
            conversation_id=call.conversation_id,
            transcription_summary=call.transcription_summary,
            duration_seconds=call.duration_seconds,
            error_message=call.error_message,
            retry_attempt=call.retry_attempt,
            created_at=call.created_at,
            updated_at=call.updated_at,
        )

    return PaginatedResponse(
        items=[to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def create_campaign(
    db: Session, user: User, payload: CreateCampaignRequest
) -> CampaignResponse:
    _validate_caller_agent(db, user.id, payload.caller_agent_id)
    _validate_lists(db, user.id, payload.list_ids)

    scheduled_at = payload.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    else:
        scheduled_at = scheduled_at.astimezone(timezone.utc)

    campaign = Campaign(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=payload.name,
        status="scheduled",
        caller_agent_id=payload.caller_agent_id,
        list_ids=json.dumps(payload.list_ids),
        scheduled_at=scheduled_at,
        timezone=payload.schedule_settings.timezone,
        retry_attempts=payload.schedule_settings.retry_attempts,
        retry_interval=payload.schedule_settings.retry_interval,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    campaign.caller_agent = (
        db.query(CallerAgent).filter(CallerAgent.id == campaign.caller_agent_id).first()
    )
    return _campaign_response(db, campaign)


def update_campaign(
    db: Session,
    user: User,
    campaign_id: str,
    payload: UpdateCampaignRequest,
) -> CampaignResponse:
    campaign = _get_campaign_or_404(db, user.id, campaign_id)
    _assert_campaign_editable(campaign)

    if payload.caller_agent_id is not None:
        _validate_caller_agent(db, user.id, payload.caller_agent_id)
        campaign.caller_agent_id = payload.caller_agent_id
    if payload.list_ids is not None:
        _validate_lists(db, user.id, payload.list_ids)
        campaign.list_ids = json.dumps(payload.list_ids)
    if payload.name is not None:
        campaign.name = payload.name
    if payload.scheduled_at is not None:
        campaign.scheduled_at = _validate_new_scheduled_at(payload.scheduled_at)
    if payload.schedule_settings is not None:
        campaign.timezone = payload.schedule_settings.timezone
        campaign.retry_attempts = payload.schedule_settings.retry_attempts
        campaign.retry_interval = payload.schedule_settings.retry_interval

    db.commit()
    db.refresh(campaign)
    campaign.caller_agent = (
        db.query(CallerAgent).filter(CallerAgent.id == campaign.caller_agent_id).first()
    )
    return _campaign_response(db, campaign)


def cancel_campaign(db: Session, user: User, campaign_id: str) -> CampaignResponse:
    campaign = _get_campaign_or_404(db, user.id, campaign_id)
    if campaign.status not in {"scheduled", "running"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled or running campaigns can be cancelled",
        )
    campaign.status = "cancelled"
    if not campaign.completed_at:
        campaign.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(campaign)
    return _campaign_response(db, campaign)


def delete_campaign(db: Session, user: User, campaign_id: str) -> None:
    campaign = _get_campaign_or_404(db, user.id, campaign_id)
    if campaign.status == "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancel a running campaign before deleting it",
        )
    db.delete(campaign)
    db.commit()


def _atomic_start_scheduled_campaign(db: Session, campaign_id: str) -> bool:
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Campaign)
        .where(Campaign.id == campaign_id, Campaign.status == "scheduled")
        .values(status="running", started_at=now)
    )
    db.commit()
    return result.rowcount > 0


def _try_begin_execution(campaign_id: str) -> bool:
    with _execution_guard:
        if campaign_id in _active_campaign_executions:
            return False
        _active_campaign_executions.add(campaign_id)
        return True


def _end_execution(campaign_id: str) -> None:
    with _execution_guard:
        _active_campaign_executions.discard(campaign_id)


def _spawn_campaign_execution(campaign_id: str) -> bool:
    if not _try_begin_execution(campaign_id):
        return False

    thread = threading.Thread(
        target=_run_campaign_in_background,
        args=(campaign_id,),
        daemon=True,
    )
    thread.start()
    return True


def _run_campaign_in_background(campaign_id: str) -> None:
    db = SessionLocal()
    try:
        execute_campaign(db, campaign_id)
    except Exception:
        logger.exception("Background campaign execution failed for %s", campaign_id)
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign and campaign.status == "running":
            campaign.status = "failed"
            db.commit()
    finally:
        db.close()
        _end_execution(campaign_id)


def trigger_campaign_start(
    db: Session, user: User, campaign_id: str
) -> CampaignResponse:
    campaign = _get_campaign_or_404(db, user.id, campaign_id)
    if campaign.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled campaigns can be started manually",
        )

    if not _atomic_start_scheduled_campaign(db, campaign_id):
        db.refresh(campaign)
        return _campaign_response(db, campaign)

    if not _spawn_campaign_execution(campaign.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Campaign is already dialing",
        )

    db.refresh(campaign)
    return _campaign_response(db, campaign)
