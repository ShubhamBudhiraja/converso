import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import CAMPAIGN_BATCH_DELAY_SECONDS, CAMPAIGN_BATCH_SIZE, WEBHOOK_BASE_URL
from app.models.call import Call
from app.models.caller_agent import CallerAgent
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.contact_list import ContactList
from app.models.user import User
from app.schemas.campaign import CampaignExecutionResponse
from app.services.ai import _get_decrypted_api_key, _handle_elevenlabs_error, _handle_encryption_error
from app.services.call_lifecycle import maybe_complete_campaign
from app.services.elevenlabs_client import (
    ElevenLabsClientError,
    configure_agent_webhooks,
    initiate_outbound_call,
)
from app.services.phone import _get_decrypted_auth_token
from app.services.twilio_client import TwilioClientError, configure_status_webhook

logger = logging.getLogger(__name__)


def _chunk(items: list[Contact], size: int) -> list[list[Contact]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def _configure_webhooks_for_caller_agent(db: Session, caller_agent: CallerAgent) -> None:
    try:
        api_key = _get_decrypted_api_key(caller_agent.elevenlabs_connection)
    except Exception as exc:
        _handle_encryption_error(exc)
        return

    twilio_connection = caller_agent.twilio_connection
    phone = caller_agent.phone_number
    if not twilio_connection or not phone or not phone.twilio_phone_sid:
        logger.warning("Skipping Twilio webhook setup: phone SID missing for caller agent %s", caller_agent.id)
    else:
        try:
            auth_token = _get_decrypted_auth_token(twilio_connection)
            configure_status_webhook(
                twilio_connection.account_sid,
                auth_token,
                phone.twilio_phone_sid,
                f"{WEBHOOK_BASE_URL}/api/v1/webhooks/twilio/status",
            )
        except TwilioClientError as exc:
            logger.warning("Failed to configure Twilio status webhook: %s", exc)

    try:
        configure_agent_webhooks(
            api_key,
            caller_agent.elevenlabs_agent_id,
            f"{WEBHOOK_BASE_URL}/api/v1/webhooks/elevenlabs/post-call",
        )
    except ElevenLabsClientError as exc:
        logger.warning("Failed to configure ElevenLabs webhook: %s", exc)


def execute_campaign(db: Session, campaign_id: str) -> CampaignExecutionResponse:
    campaign = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.caller_agent).joinedload(CallerAgent.phone_number),
            joinedload(Campaign.caller_agent).joinedload(CallerAgent.twilio_connection),
            joinedload(Campaign.caller_agent).joinedload(CallerAgent.elevenlabs_connection),
        )
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status != "running":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign is not running")

    caller_agent = campaign.caller_agent
    if not caller_agent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Caller agent not found")

    phone = caller_agent.phone_number
    if not phone or not phone.elevenlabs_phone_number_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Caller agent phone is not registered with ElevenLabs",
        )

    list_ids = json.loads(campaign.list_ids)
    contact_lists = (
        db.query(ContactList)
        .filter(ContactList.id.in_(list_ids), ContactList.status == "completed")
        .all()
    )
    if not contact_lists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid contact lists found")

    contacts = (
        db.query(Contact)
        .filter(Contact.contact_list_id.in_(list_ids))
        .order_by(Contact.row_number.asc())
        .all()
    )
    if not contacts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No contacts found in selected lists")

    existing_contact_ids = {
        row[0]
        for row in db.query(Call.contact_id)
        .filter(Call.campaign_id == campaign_id, Call.contact_id.isnot(None))
        .all()
    }
    contacts = [contact for contact in contacts if contact.id not in existing_contact_ids]
    if not contacts:
        maybe_complete_campaign(db, campaign.id)
        return CampaignExecutionResponse(
            success=True,
            total_contacts=len(existing_contact_ids),
            calls_initiated=0,
            errors=[],
        )

    _configure_webhooks_for_caller_agent(db, caller_agent)

    try:
        api_key = _get_decrypted_api_key(caller_agent.elevenlabs_connection)
    except Exception as exc:
        _handle_encryption_error(exc)
        raise

    calls_initiated = 0
    errors: list[str] = []

    for batch in _chunk(contacts, CAMPAIGN_BATCH_SIZE):
        for contact in batch:
            call_record = Call(
                id=str(uuid.uuid4()),
                user_id=campaign.user_id,
                campaign_id=campaign.id,
                contact_id=contact.id,
                caller_agent_id=caller_agent.id,
                phone_number=contact.phone_number,
                direction="outbound",
                status="pending",
                retry_attempt=1,
            )
            db.add(call_record)
            db.flush()

            try:
                result = initiate_outbound_call(
                    api_key,
                    agent_id=caller_agent.elevenlabs_agent_id,
                    agent_phone_number_id=phone.elevenlabs_phone_number_id,
                    to_number=contact.phone_number,
                )

                metadata: dict[str, Any] = {
                    "elevenlabs_response": result.raw_response,
                    "contact_name": " ".join(
                        part for part in [contact.first_name, contact.last_name] if part
                    ),
                }
                call_record.call_sid = result.call_sid
                call_record.conversation_id = result.conversation_id
                call_record.status = "initiated"
                call_record.provider_metadata = json.dumps(metadata)
                db.commit()
                calls_initiated += 1
            except ElevenLabsClientError as exc:
                call_record.status = "failed"
                call_record.error_message = str(exc)
                db.commit()
                errors.append(f"{contact.phone_number}: {exc}")
                logger.error("Failed to initiate call for %s: %s", contact.phone_number, exc)
            except Exception as exc:
                call_record.status = "failed"
                call_record.error_message = str(exc)
                db.commit()
                errors.append(f"{contact.phone_number}: {exc}")
                logger.exception("Unexpected error initiating call for %s", contact.phone_number)

        if batch is not contacts[-CAMPAIGN_BATCH_SIZE:]:
            time.sleep(CAMPAIGN_BATCH_DELAY_SECONDS)

    maybe_complete_campaign(db, campaign.id)

    return CampaignExecutionResponse(
        success=True,
        total_contacts=len(contacts),
        calls_initiated=calls_initiated,
        errors=errors,
    )


def start_campaign_execution(db: Session, user: User, campaign_id: str) -> CampaignExecutionResponse:
    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id, Campaign.user_id == user.id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status not in {"scheduled", "running"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled or running campaigns can be started",
        )

    if campaign.status == "scheduled":
        campaign.status = "running"
        campaign.started_at = datetime.now(timezone.utc)
        db.commit()

    return execute_campaign(db, campaign_id)
