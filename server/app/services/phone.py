import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.encryption import EncryptionError, decrypt_value, encrypt_value, mask_secret
from app.models.phone_number import PhoneNumber
from app.models.twilio_connection import TwilioConnection
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.phone import (
    BulkDeleteResponse,
    PhoneNumberResponse,
    PurchasePhoneNumberRequest,
    RegisterElevenLabsRequest,
    SavePhoneNumberRequest,
    TwilioAccountNumberResponse,
    TwilioAvailableNumberResponse,
    TwilioConnectionResponse,
    TwilioCredentialsRequest,
    TwilioTestResponse,
    UpdateTwilioConnectionRequest,
)
from app.services.ai import (
    _get_decrypted_api_key as _get_elevenlabs_api_key,
    _handle_elevenlabs_error,
    get_elevenlabs_connection_for_user,
)
from app.services.elevenlabs_client import ElevenLabsClientError, import_phone_number
from app.services.twilio_client import (
    TwilioClientError,
    find_twilio_phone_number,
    list_available_twilio_phone_numbers,
    list_twilio_phone_numbers,
    purchase_twilio_phone_number,
    test_twilio_credentials,
)


def _connection_response(
    connection: TwilioConnection,
    auth_token: Optional[str] = None,
    phone_number_count: int = 0,
) -> TwilioConnectionResponse:
    token_for_mask = auth_token
    if token_for_mask is None:
        token_for_mask = decrypt_value(connection.auth_token_encrypted)

    return TwilioConnectionResponse(
        id=connection.id,
        account_sid_masked=mask_secret(connection.account_sid, visible_start=2, visible_end=4),
        auth_token_masked=mask_secret(token_for_mask, visible_start=0, visible_end=4),
        label=connection.label,
        is_valid=connection.is_valid,
        last_tested_at=connection.last_tested_at,
        phone_number_count=phone_number_count,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


def _get_connection_by_id_or_404(
    db: Session,
    user_id: str,
    connection_id: str,
) -> TwilioConnection:
    connection = (
        db.query(TwilioConnection)
        .filter(
            TwilioConnection.id == connection_id,
            TwilioConnection.user_id == user_id,
        )
        .first()
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Twilio connection not found",
        )
    return connection


def _get_decrypted_auth_token(connection: TwilioConnection) -> str:
    return decrypt_value(connection.auth_token_encrypted)


def _handle_twilio_error(exc: TwilioClientError) -> None:
    if exc.status_code == 401:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if exc.status_code and 400 <= exc.status_code < 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=str(exc),
    ) from exc


def _handle_encryption_error(exc: Exception) -> None:
    if isinstance(exc, EncryptionError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    raise exc


def _phone_number_response(phone_number: PhoneNumber) -> PhoneNumberResponse:
    return PhoneNumberResponse.model_validate(phone_number)


def _phone_number_query(db: Session, user_id: str):
    return db.query(PhoneNumber).filter(PhoneNumber.user_id == user_id)


def _phone_number_counts(db: Session, user_id: str) -> dict[str, int]:
    rows = (
        db.query(PhoneNumber.twilio_connection_id, func.count(PhoneNumber.id))
        .filter(PhoneNumber.user_id == user_id)
        .group_by(PhoneNumber.twilio_connection_id)
        .all()
    )
    return {connection_id: count for connection_id, count in rows}


def list_twilio_connections(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[TwilioConnectionResponse]:
    query = (
        db.query(TwilioConnection)
        .filter(TwilioConnection.user_id == user.id)
        .order_by(TwilioConnection.created_at.desc())
    )
    total = query.count()
    connections = query.offset((page - 1) * page_size).limit(page_size).all()
    counts = _phone_number_counts(db, user.id)

    try:
        items = [
            _connection_response(connection, phone_number_count=counts.get(connection.id, 0))
            for connection in connections
        ]
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def create_twilio_connection(
    db: Session,
    user: User,
    payload: TwilioCredentialsRequest,
) -> TwilioConnectionResponse:
    existing = (
        db.query(TwilioConnection)
        .filter(
            TwilioConnection.user_id == user.id,
            TwilioConnection.account_sid == payload.account_sid,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Twilio account is already connected",
        )

    try:
        test_twilio_credentials(payload.account_sid, payload.auth_token)
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    now = datetime.now(timezone.utc)
    try:
        connection = TwilioConnection(
            id=str(uuid.uuid4()),
            user_id=user.id,
            account_sid=payload.account_sid,
            auth_token_encrypted=encrypt_value(payload.auth_token),
            label=payload.label,
            is_valid=True,
            last_tested_at=now,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    return _connection_response(connection, auth_token=payload.auth_token)


def get_twilio_connection(
    db: Session,
    user: User,
    connection_id: str,
) -> TwilioConnectionResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    counts = _phone_number_counts(db, user.id)
    try:
        return _connection_response(
            connection,
            phone_number_count=counts.get(connection.id, 0),
        )
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def update_twilio_connection(
    db: Session,
    user: User,
    connection_id: str,
    payload: UpdateTwilioConnectionRequest,
) -> TwilioConnectionResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)

    if payload.label is not None:
        connection.label = payload.label

    if payload.auth_token is not None:
        try:
            test_twilio_credentials(connection.account_sid, payload.auth_token)
            connection.auth_token_encrypted = encrypt_value(payload.auth_token)
            connection.is_valid = True
            connection.last_tested_at = datetime.now(timezone.utc)
        except TwilioClientError as exc:
            _handle_twilio_error(exc)
        except EncryptionError as exc:
            _handle_encryption_error(exc)

    connection.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(connection)

    counts = _phone_number_counts(db, user.id)
    try:
        return _connection_response(
            connection,
            auth_token=payload.auth_token,
            phone_number_count=counts.get(connection.id, 0),
        )
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def delete_twilio_connection(db: Session, user: User, connection_id: str) -> None:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    db.delete(connection)
    db.commit()


def bulk_delete_twilio_connections(
    db: Session,
    user: User,
    connection_ids: list[str],
) -> BulkDeleteResponse:
    unique_ids = list(dict.fromkeys(connection_ids))
    connections = (
        db.query(TwilioConnection)
        .filter(
            TwilioConnection.user_id == user.id,
            TwilioConnection.id.in_(unique_ids),
        )
        .all()
    )
    found_ids = {connection.id for connection in connections}
    not_found_ids = [item for item in unique_ids if item not in found_ids]

    for connection in connections:
        db.delete(connection)

    db.commit()
    return BulkDeleteResponse(
        deleted_count=len(connections),
        not_found_ids=not_found_ids,
    )


def test_unsaved_twilio_credentials(
    account_sid: str,
    auth_token: str,
) -> TwilioTestResponse:
    try:
        account_info = test_twilio_credentials(account_sid, auth_token)
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    return TwilioTestResponse(
        success=True,
        message="Twilio connection successful",
        account_friendly_name=account_info.friendly_name,
    )


def test_twilio_connection(
    db: Session,
    user: User,
    connection_id: str,
) -> TwilioTestResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    auth_token = _get_decrypted_auth_token(connection)

    try:
        account_info = test_twilio_credentials(connection.account_sid, auth_token)
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    connection.is_valid = True
    connection.last_tested_at = datetime.now(timezone.utc)
    db.commit()

    return TwilioTestResponse(
        success=True,
        message="Twilio connection successful",
        account_friendly_name=account_info.friendly_name,
    )


def list_account_phone_numbers(
    db: Session,
    user: User,
    connection_id: str,
) -> list[TwilioAccountNumberResponse]:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    auth_token = _get_decrypted_auth_token(connection)

    try:
        numbers = list_twilio_phone_numbers(connection.account_sid, auth_token)
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    return [
        TwilioAccountNumberResponse(
            sid=number.sid,
            phone_number=number.phone_number,
            friendly_name=number.friendly_name,
            voice_enabled=number.voice_enabled,
            sms_enabled=number.sms_enabled,
        )
        for number in numbers
    ]


def list_available_phone_numbers(
    db: Session,
    user: User,
    connection_id: str,
    country_code: str = "US",
    area_code: Optional[str] = None,
    number_type: str = "local",
    limit: int = 20,
) -> list[TwilioAvailableNumberResponse]:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    auth_token = _get_decrypted_auth_token(connection)

    try:
        numbers = list_available_twilio_phone_numbers(
            connection.account_sid,
            auth_token,
            country_code=country_code.upper(),
            area_code=area_code,
            number_type=number_type,
            limit=limit,
        )
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    return [
        TwilioAvailableNumberResponse(
            phone_number=number.phone_number,
            friendly_name=number.friendly_name,
            locality=number.locality,
            region=number.region,
            country_code=number.country_code,
            voice_enabled=number.voice_enabled,
            sms_enabled=number.sms_enabled,
            mms_enabled=number.mms_enabled,
        )
        for number in numbers
    ]


def list_saved_phone_numbers(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 10,
    twilio_connection_id: Optional[str] = None,
) -> PaginatedResponse[PhoneNumberResponse]:
    query = _phone_number_query(db, user.id).order_by(PhoneNumber.created_at.desc())
    if twilio_connection_id:
        query = query.filter(PhoneNumber.twilio_connection_id == twilio_connection_id)
    total = query.count()
    phone_numbers = query.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_phone_number_response(phone_number) for phone_number in phone_numbers],
        total=total,
        page=page,
        page_size=page_size,
    )


def save_phone_number(
    db: Session,
    user: User,
    payload: SavePhoneNumberRequest,
) -> PhoneNumberResponse:
    connection = _get_connection_by_id_or_404(db, user.id, payload.twilio_connection_id)
    auth_token = _get_decrypted_auth_token(connection)

    existing = (
        db.query(PhoneNumber)
        .filter(
            PhoneNumber.user_id == user.id,
            PhoneNumber.phone_number == payload.phone_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This phone number is already saved",
        )

    try:
        twilio_number = find_twilio_phone_number(
            connection.account_sid,
            auth_token,
            payload.phone_number,
        )
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    if not twilio_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not found in the selected Twilio account",
        )

    phone_number = PhoneNumber(
        id=str(uuid.uuid4()),
        user_id=user.id,
        twilio_connection_id=connection.id,
        phone_number=twilio_number.phone_number,
        twilio_phone_sid=twilio_number.sid,
        label=payload.label or twilio_number.friendly_name,
        status="active",
    )
    db.add(phone_number)
    db.commit()
    db.refresh(phone_number)
    return _phone_number_response(phone_number)


def purchase_phone_number(
    db: Session,
    user: User,
    payload: PurchasePhoneNumberRequest,
) -> PhoneNumberResponse:
    connection = _get_connection_by_id_or_404(db, user.id, payload.twilio_connection_id)
    auth_token = _get_decrypted_auth_token(connection)

    existing = (
        db.query(PhoneNumber)
        .filter(
            PhoneNumber.user_id == user.id,
            PhoneNumber.phone_number == payload.phone_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This phone number is already saved",
        )

    try:
        twilio_number = purchase_twilio_phone_number(
            connection.account_sid,
            auth_token,
            payload.phone_number,
            friendly_name=payload.label,
        )
    except TwilioClientError as exc:
        _handle_twilio_error(exc)

    phone_number = PhoneNumber(
        id=str(uuid.uuid4()),
        user_id=user.id,
        twilio_connection_id=connection.id,
        phone_number=twilio_number.phone_number,
        twilio_phone_sid=twilio_number.sid,
        label=payload.label or twilio_number.friendly_name,
        status="active",
    )
    db.add(phone_number)
    db.commit()
    db.refresh(phone_number)
    return _phone_number_response(phone_number)


def get_saved_phone_number(db: Session, user: User, phone_number_id: str) -> PhoneNumberResponse:
    phone_number = (
        _phone_number_query(db, user.id)
        .filter(PhoneNumber.id == phone_number_id)
        .first()
    )
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )
    return _phone_number_response(phone_number)


def delete_saved_phone_number(db: Session, user: User, phone_number_id: str) -> None:
    phone_number = (
        db.query(PhoneNumber)
        .filter(PhoneNumber.id == phone_number_id, PhoneNumber.user_id == user.id)
        .first()
    )
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )
    db.delete(phone_number)
    db.commit()


def bulk_delete_phone_numbers(
    db: Session,
    user: User,
    phone_number_ids: list[str],
) -> BulkDeleteResponse:
    unique_ids = list(dict.fromkeys(phone_number_ids))
    phone_numbers = (
        db.query(PhoneNumber)
        .filter(
            PhoneNumber.user_id == user.id,
            PhoneNumber.id.in_(unique_ids),
        )
        .all()
    )
    found_ids = {phone_number.id for phone_number in phone_numbers}
    not_found_ids = [item for item in unique_ids if item not in found_ids]

    for phone_number in phone_numbers:
        db.delete(phone_number)

    db.commit()
    return BulkDeleteResponse(
        deleted_count=len(phone_numbers),
        not_found_ids=not_found_ids,
    )


def register_phone_number_with_elevenlabs(
    db: Session,
    user: User,
    phone_number_id: str,
    payload: RegisterElevenLabsRequest,
) -> PhoneNumberResponse:
    phone_number = (
        db.query(PhoneNumber)
        .filter(PhoneNumber.id == phone_number_id, PhoneNumber.user_id == user.id)
        .first()
    )
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found",
        )

    if phone_number.elevenlabs_phone_number_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number is already registered with ElevenLabs",
        )

    twilio_connection = _get_connection_by_id_or_404(
        db,
        user.id,
        phone_number.twilio_connection_id,
    )
    elevenlabs_connection = get_elevenlabs_connection_for_user(
        db,
        user.id,
        payload.elevenlabs_connection_id,
    )

    try:
        twilio_auth_token = _get_decrypted_auth_token(twilio_connection)
        elevenlabs_api_key = _get_elevenlabs_api_key(elevenlabs_connection)
        result = import_phone_number(
            elevenlabs_api_key,
            phone_number.phone_number,
            twilio_connection.account_sid,
            twilio_auth_token,
            phone_number.label or phone_number.phone_number,
        )
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    phone_number.elevenlabs_connection_id = elevenlabs_connection.id
    phone_number.elevenlabs_phone_number_id = result.phone_number_id
    db.commit()
    db.refresh(phone_number)
    return _phone_number_response(phone_number)
