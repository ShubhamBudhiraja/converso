from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.database.connection import Base, engine
from app.models import user  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Converso API", lifespan=lifespan)

app.include_router(api_router, prefix="/api/v1")
