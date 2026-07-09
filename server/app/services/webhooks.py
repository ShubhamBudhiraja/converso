import hashlib
import hmac
import json
import logging
import time
from typing import Any, Optional

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import ELEVENLABS_WEBHOOK_SECRET
from app.services.call_lifecycle import (
    update_call_from_elevenlabs_post_call,
    update_call_from_twilio_status,
)

logger = logging.getLogger(__name__)


def _validate_elevenlabs_signature(body: bytes, signature_header: Optional[str]) -> bool:
    if not ELEVENLABS_WEBHOOK_SECRET:
        return True
    if not signature_header:
        return False

    parts = {}
    for segment in signature_header.split(","):
        key, _, value = segment.partition("=")
        parts[key.strip()] = value.strip()

    timestamp = parts.get("t")
    provided = parts.get("v0")
    if not timestamp or not provided:
        return False

    try:
        if abs(time.time() - int(timestamp)) > 300:
            return False
    except ValueError:
        return False

    payload = f"{timestamp}.{body.decode('utf-8')}"
    expected = hmac.new(
        ELEVENLABS_WEBHOOK_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, provided)


def handle_twilio_status(db: Session, form_data: dict[str, Any]) -> None:
    call_sid = form_data.get("CallSid")
    raw_status = form_data.get("CallStatus")
    if not call_sid or not raw_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Twilio payload")

    duration_raw = form_data.get("CallDuration")
    duration = int(duration_raw) if duration_raw and str(duration_raw).isdigit() else None

    update_call_from_twilio_status(
        db,
        call_sid=call_sid,
        raw_status=raw_status,
        duration=duration,
        raw_payload=form_data,
    )


def handle_elevenlabs_post_call(db: Session, request: Request, body: bytes) -> dict[str, str]:
    signature = request.headers.get("ElevenLabs-Signature")
    if not _validate_elevenlabs_signature(body, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload") from exc

    event_type = payload.get("type")
    data = payload.get("data") or payload

    conversation_id = data.get("conversation_id") or data.get("conversationId")
    agent_id = data.get("agent_id") or data.get("agentId")
    analysis = data.get("analysis") or {}
    metadata = data.get("metadata") or {}

    transcript_summary = analysis.get("transcript_summary")
    call_duration_secs = metadata.get("call_duration_secs")

    if conversation_id:
        update_call_from_elevenlabs_post_call(
            db,
            conversation_id=conversation_id,
            agent_id=agent_id,
            transcript_summary=transcript_summary,
            call_duration_secs=call_duration_secs,
            raw_payload={"type": event_type, "data": data},
        )

    return {"status": "received"}
