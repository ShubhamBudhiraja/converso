from pathlib import Path

import bcrypt
from jose import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

JWT_SECRET = os.getenv("JWT_SECRET_KEY")


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data):
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=30)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
