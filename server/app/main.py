from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.database.connection import Base, engine
from app.models import password_reset, phone_number, session, twilio_connection, user  # noqa: F401


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_twilio_connections()
    yield


app = FastAPI(title="Converso API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
