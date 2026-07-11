from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.database.connection import Base, engine
from app.models import (
    call,
    caller_agent,
    campaign,
    contact,
    contact_list,
    elevenlabs_connection,
    lead,
    password_reset,
    phone_number,
    session,
    twilio_connection,
    user,
)  # noqa: F401
from app.services.campaign_scheduler import check_scheduled_campaigns

scheduler = BackgroundScheduler()


def _migrate_twilio_connections() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE twilio_connections "
                "DROP CONSTRAINT IF EXISTS twilio_connections_user_id_key"
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_user_twilio_account_sid "
                "ON twilio_connections (user_id, account_sid)"
            )
        )


def _migrate_phone_numbers_elevenlabs() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE phone_numbers "
                "ADD COLUMN IF NOT EXISTS elevenlabs_connection_id VARCHAR"
            )
        )


def _migrate_caller_agents() -> None:
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS conversation_agents CASCADE"))
        conn.execute(
            text("ALTER TABLE phone_numbers " "DROP COLUMN IF EXISTS assigned_agent_id")
        )
        conn.execute(text("ALTER TABLE caller_agents " "DROP COLUMN IF EXISTS label"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_twilio_connections()
    _migrate_phone_numbers_elevenlabs()
    _migrate_caller_agents()
    scheduler.add_job(
        check_scheduled_campaigns, "interval", minutes=1, id="campaign_scheduler"
    )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Converso API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
