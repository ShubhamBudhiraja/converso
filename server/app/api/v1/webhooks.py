from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services import webhooks as webhooks_service

router = APIRouter()


@router.post("/twilio/status")
async def twilio_status_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    form = await request.form()
    webhooks_service.handle_twilio_status(db, dict(form))
    return {"status": "received"}


@router.post("/elevenlabs/post-call")
async def elevenlabs_post_call_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    body = await request.body()
    return webhooks_service.handle_elevenlabs_post_call(db, request, body)
