from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DB_URL = os.getenv("DATABASE_URL")

engine = create_engine(DB_URL)

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
