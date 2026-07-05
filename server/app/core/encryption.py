import base64
import hashlib
import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


class EncryptionError(Exception):
    pass


@lru_cache
def _get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise EncryptionError("ENCRYPTION_KEY environment variable is not set")
    derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived)


def encrypt_value(value: str) -> str:
    if not value:
        raise EncryptionError("Cannot encrypt an empty value")
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        raise EncryptionError("Cannot decrypt an empty value")
    try:
        return _get_fernet().decrypt(encrypted_value.encode()).decode()
    except InvalidToken as exc:
        raise EncryptionError("Failed to decrypt value") from exc


def mask_secret(value: str, visible_start: int = 2, visible_end: int = 4) -> str:
    if len(value) <= visible_start + visible_end:
        return "*" * len(value)
    return f"{value[:visible_start]}{'*' * (len(value) - visible_start - visible_end)}{value[-visible_end:]}"
