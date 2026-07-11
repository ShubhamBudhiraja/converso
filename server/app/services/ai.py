import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.encryption import (
    EncryptionError,
    decrypt_value,
    encrypt_value,
    mask_secret,
)
from app.models.elevenlabs_connection import ElevenLabsConnection
from app.models.phone_number import PhoneNumber
from app.models.user import User
from app.schemas.ai import (
    BulkDeleteResponse,
    CreateElevenLabsAgentRequest,
    ElevenLabsAgentDetailResponse,
    ElevenLabsAgentResponse,
    ElevenLabsConnectionResponse,
    ElevenLabsCredentialsRequest,
    ElevenLabsTestResponse,
    ElevenLabsVoiceResponse,
    UpdateElevenLabsAgentRequest,
    UpdateElevenLabsConnectionRequest,
)
from app.schemas.pagination import PaginatedResponse, slice_page
from app.services.campaign_resource_guards import (
    assert_elevenlabs_agent_not_used_by_campaign,
    assert_elevenlabs_connection_not_used_by_campaign,
)
from app.services.elevenlabs_client import (
    ElevenLabsClientError,
    create_agent,
    delete_agent,
    get_agent,
    list_agents,
    list_voices,
    update_agent,
    validate_api_key,
)


def _connection_response(
    connection: ElevenLabsConnection,
    api_key: Optional[str] = None,
    agent_count: int = 0,
) -> ElevenLabsConnectionResponse:
    key_for_mask = api_key
    if key_for_mask is None:
        key_for_mask = decrypt_value(connection.api_key_encrypted)

    return ElevenLabsConnectionResponse(
        id=connection.id,
        api_key_masked=mask_secret(key_for_mask, visible_start=0, visible_end=4),
        label=connection.label,
        is_valid=connection.is_valid,
        last_tested_at=connection.last_tested_at,
        agent_count=agent_count,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
    )


def _get_connection_by_id_or_404(
    db: Session,
    user_id: str,
    connection_id: str,
) -> ElevenLabsConnection:
    connection = (
        db.query(ElevenLabsConnection)
        .filter(
            ElevenLabsConnection.id == connection_id,
            ElevenLabsConnection.user_id == user_id,
        )
        .first()
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ElevenLabs connection not found",
        )
    return connection


def get_elevenlabs_connection_for_user(
    db: Session,
    user_id: str,
    connection_id: str,
) -> ElevenLabsConnection:
    return _get_connection_by_id_or_404(db, user_id, connection_id)


def _get_decrypted_api_key(connection: ElevenLabsConnection) -> str:
    return decrypt_value(connection.api_key_encrypted)


def _handle_elevenlabs_error(exc: ElevenLabsClientError) -> None:
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


def _fetch_agent_count(api_key: str) -> int:
    try:
        return len(list_agents(api_key))
    except ElevenLabsClientError:
        return 0


def list_elevenlabs_connections(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[ElevenLabsConnectionResponse]:
    query = (
        db.query(ElevenLabsConnection)
        .filter(ElevenLabsConnection.user_id == user.id)
        .order_by(ElevenLabsConnection.created_at.desc())
    )
    total = query.count()
    connections = query.offset((page - 1) * page_size).limit(page_size).all()
    try:
        responses = []
        for connection in connections:
            api_key = decrypt_value(connection.api_key_encrypted)
            agent_count = _fetch_agent_count(api_key) if connection.is_valid else 0
            responses.append(
                _connection_response(
                    connection,
                    api_key=api_key,
                    agent_count=agent_count,
                )
            )
        return PaginatedResponse(
            items=responses,
            total=total,
            page=page,
            page_size=page_size,
        )
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def create_elevenlabs_connection(
    db: Session,
    user: User,
    payload: ElevenLabsCredentialsRequest,
) -> ElevenLabsConnectionResponse:
    try:
        user_info = validate_api_key(payload.api_key)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)

    now = datetime.now(timezone.utc)
    try:
        connection = ElevenLabsConnection(
            id=str(uuid.uuid4()),
            user_id=user.id,
            api_key_encrypted=encrypt_value(payload.api_key),
            label=payload.label,
            is_valid=True,
            last_tested_at=now,
        )
        db.add(connection)
        db.commit()
        db.refresh(connection)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    agent_count = _fetch_agent_count(payload.api_key)
    return _connection_response(
        connection,
        api_key=payload.api_key,
        agent_count=agent_count,
    )


def get_elevenlabs_connection(
    db: Session,
    user: User,
    connection_id: str,
) -> ElevenLabsConnectionResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = decrypt_value(connection.api_key_encrypted)
        agent_count = _fetch_agent_count(api_key) if connection.is_valid else 0
        return _connection_response(
            connection,
            api_key=api_key,
            agent_count=agent_count,
        )
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def update_elevenlabs_connection(
    db: Session,
    user: User,
    connection_id: str,
    payload: UpdateElevenLabsConnectionRequest,
) -> ElevenLabsConnectionResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    assert_elevenlabs_connection_not_used_by_campaign(db, user.id, connection_id)

    if payload.label is not None:
        connection.label = payload.label

    db.commit()
    db.refresh(connection)
    return get_elevenlabs_connection(db, user, connection_id)


def delete_elevenlabs_connection(
    db: Session,
    user: User,
    connection_id: str,
) -> None:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    assert_elevenlabs_connection_not_used_by_campaign(
        db, user.id, connection_id, action="deleted"
    )

    (
        db.query(PhoneNumber)
        .filter(
            PhoneNumber.user_id == user.id,
            PhoneNumber.elevenlabs_connection_id == connection_id,
        )
        .update(
            {
                PhoneNumber.elevenlabs_connection_id: None,
                PhoneNumber.elevenlabs_phone_number_id: None,
            },
            synchronize_session=False,
        )
    )

    db.delete(connection)
    db.commit()


def bulk_delete_elevenlabs_connections(
    db: Session,
    user: User,
    connection_ids: list[str],
) -> BulkDeleteResponse:
    existing_ids = {
        row.id
        for row in db.query(ElevenLabsConnection.id)
        .filter(
            ElevenLabsConnection.user_id == user.id,
            ElevenLabsConnection.id.in_(connection_ids),
        )
        .all()
    }
    not_found_ids = [item for item in connection_ids if item not in existing_ids]

    for connection_id in existing_ids:
        delete_elevenlabs_connection(db, user, connection_id)

    return BulkDeleteResponse(
        deleted_count=len(existing_ids),
        not_found_ids=not_found_ids,
    )


def test_unsaved_elevenlabs_credentials(api_key: str) -> ElevenLabsTestResponse:
    try:
        user_info = validate_api_key(api_key)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)

    return ElevenLabsTestResponse(
        success=True,
        message="ElevenLabs connection successful",
        subscription_tier=user_info.subscription_tier,
        character_count=user_info.character_count,
        character_limit=user_info.character_limit,
    )


def test_elevenlabs_connection(
    db: Session,
    user: User,
    connection_id: str,
) -> ElevenLabsTestResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = _get_decrypted_api_key(connection)
        user_info = validate_api_key(api_key)
    except ElevenLabsClientError as exc:
        connection.is_valid = False
        db.commit()
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    connection.is_valid = True
    connection.last_tested_at = datetime.now(timezone.utc)
    db.commit()

    return ElevenLabsTestResponse(
        success=True,
        message="ElevenLabs connection successful",
        subscription_tier=user_info.subscription_tier,
        character_count=user_info.character_count,
        character_limit=user_info.character_limit,
    )


def list_elevenlabs_agents(
    db: Session,
    user: User,
    connection_id: str,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[ElevenLabsAgentResponse]:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = _get_decrypted_api_key(connection)
        agents = list_agents(api_key)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    all_agents = [
        ElevenLabsAgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            created_at_unix_secs=agent.created_at_unix_secs,
        )
        for agent in agents
    ]
    page_items, total = slice_page(all_agents, page, page_size)
    return PaginatedResponse(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
    )


def list_elevenlabs_voices(
    db: Session,
    user: User,
    connection_id: str,
) -> list[ElevenLabsVoiceResponse]:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = _get_decrypted_api_key(connection)
        voices = list_voices(api_key)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    return [
        ElevenLabsVoiceResponse(
            voice_id=voice.voice_id,
            name=voice.name,
            language=voice.language,
            gender=voice.gender,
            accent=voice.accent,
            description=voice.description,
        )
        for voice in voices
    ]


def _elevenlabs_agent_detail(
    api_key: str, agent_id: str
) -> ElevenLabsAgentDetailResponse:
    el_data = get_agent(api_key, agent_id)
    details = _extract_agent_details(el_data)
    return ElevenLabsAgentDetailResponse(
        agent_id=agent_id,
        name=details["name"] or "Unnamed agent",
        system_prompt=details.get("system_prompt"),
        first_message=details.get("first_message"),
        voice_id=details.get("voice_id"),
        llm=details.get("llm"),
    )


def create_elevenlabs_agent(
    db: Session,
    user: User,
    connection_id: str,
    payload: CreateElevenLabsAgentRequest,
) -> ElevenLabsAgentDetailResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = _get_decrypted_api_key(connection)
        elevenlabs_agent_id = create_agent(
            api_key,
            name=payload.name,
            system_prompt=payload.system_prompt,
            first_message=payload.first_message,
            voice_id=payload.voice_id,
            llm=payload.llm,
        )
        return _elevenlabs_agent_detail(api_key, elevenlabs_agent_id)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def get_elevenlabs_agent(
    db: Session,
    user: User,
    connection_id: str,
    agent_id: str,
) -> ElevenLabsAgentDetailResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    try:
        api_key = _get_decrypted_api_key(connection)
        return _elevenlabs_agent_detail(api_key, agent_id)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def update_elevenlabs_agent(
    db: Session,
    user: User,
    connection_id: str,
    agent_id: str,
    payload: UpdateElevenLabsAgentRequest,
) -> ElevenLabsAgentDetailResponse:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    assert_elevenlabs_agent_not_used_by_campaign(
        db, user.id, connection_id, agent_id
    )

    if (
        payload.name is None
        and payload.system_prompt is None
        and payload.first_message is None
        and payload.voice_id is None
        and payload.llm is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided",
        )

    try:
        api_key = _get_decrypted_api_key(connection)
        update_agent(
            api_key,
            agent_id,
            name=payload.name,
            system_prompt=payload.system_prompt,
            first_message=payload.first_message,
            voice_id=payload.voice_id,
            llm=payload.llm,
        )
        return _elevenlabs_agent_detail(api_key, agent_id)
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def delete_elevenlabs_agent(
    db: Session,
    user: User,
    connection_id: str,
    agent_id: str,
) -> None:
    connection = _get_connection_by_id_or_404(db, user.id, connection_id)
    assert_elevenlabs_agent_not_used_by_campaign(
        db, user.id, connection_id, agent_id, action="deleted"
    )
    try:
        api_key = _get_decrypted_api_key(connection)
        delete_agent(api_key, agent_id)
    except ElevenLabsClientError as exc:
        if exc.status_code != 404:
            _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)


def _extract_agent_details(el_data: dict) -> dict[str, Optional[str]]:
    conversation_config = el_data.get("conversation_config") or {}
    agent_config = conversation_config.get("agent") or {}
    prompt_config = agent_config.get("prompt") or {}
    tts_config = conversation_config.get("tts") or {}
    platform_settings = el_data.get("platform_settings") or {}

    return {
        "name": platform_settings.get("name") or el_data.get("name") or "Unnamed agent",
        "system_prompt": prompt_config.get("prompt"),
        "first_message": agent_config.get("first_message"),
        "voice_id": tts_config.get("voice_id"),
        "llm": prompt_config.get("llm"),
    }
