import logging
import threading

from app.database.connection import SessionLocal
from app.models.campaign import Campaign
from app.services.campaigns import _run_campaign_in_background

logger = logging.getLogger(__name__)


def _scheduled_at_utc(campaign: Campaign):
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo

    scheduled_at = campaign.scheduled_at
    if scheduled_at.tzinfo is None:
        try:
            local_tz = ZoneInfo(campaign.timezone)
            scheduled_at = scheduled_at.replace(tzinfo=local_tz)
        except Exception:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    return scheduled_at.astimezone(timezone.utc)


def check_scheduled_campaigns() -> None:
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        campaigns = (
            db.query(Campaign)
            .filter(Campaign.status == "scheduled")
            .all()
        )
        for campaign in campaigns:
            try:
                if _scheduled_at_utc(campaign) <= now:
                    campaign.status = "running"
                    campaign.started_at = now
                    db.commit()
                    logger.info("Starting scheduled campaign %s", campaign.id)
                    thread = threading.Thread(
                        target=_run_campaign_in_background,
                        args=(campaign.id,),
                        daemon=True,
                    )
                    thread.start()
            except Exception:
                logger.exception("Failed to start scheduled campaign %s", campaign.id)
                db.rollback()
                failed = db.query(Campaign).filter(Campaign.id == campaign.id).first()
                if failed:
                    failed.status = "failed"
                    db.commit()
    finally:
        db.close()
