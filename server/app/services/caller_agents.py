import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.encryption import EncryptionError
from app.models.caller_agent import CallerAgent
from app.models.elevenlabs_connection import ElevenLabsConnection
from app.models.phone_number import PhoneNumber
from app.models.twilio_connection import TwilioConnection
from app.models.user import User
from app.schemas.caller_agent import CallerAgentResponse, CreateCallerAgentRequest
from app.schemas.pagination import PaginatedResponse
from app.services.ai import (
    _get_decrypted_api_key,
    _handle_elevenlabs_error,
    _handle_encryption_error,
    get_elevenlabs_connection_for_user,
)
from app.services.elevenlabs_client import (
    ElevenLabsClientError,
    get_agent,
    import_phone_number,
    list_agents,
    update_phone_number_agent,
)
from app.services.phone import _get_connection_by_id_or_404, _get_decrypted_auth_token


def _caller_agent_response(agent: CallerAgent) -> CallerAgentResponse:
    phone = agent.phone_number
    twilio = agent.twilio_connection
    elevenlabs = agent.elevenlabs_connection

    return CallerAgentResponse(
        id=agent.id,
        name=agent.name,
        twilio_connection_id=agent.twilio_connection_id,
        twilio_connection_label=twilio.label if twilio else None,
        phone_number_id=agent.phone_number_id,
        phone_number=phone.phone_number if phone else "",
        phone_label=phone.label if phone else None,
        elevenlabs_connection_id=agent.elevenlabs_connection_id,
        elevenlabs_connection_label=elevenlabs.label if elevenlabs else None,
        elevenlabs_agent_id=agent.elevenlabs_agent_id,
        elevenlabs_agent_name=None,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
    )


def _get_caller_agent_by_id_or_404(
    db: Session, user_id: str, agent_id: str
) -> CallerAgent:
    agent = (
        db.query(CallerAgent)
        .options(
            joinedload(CallerAgent.phone_number),
            joinedload(CallerAgent.twilio_connection),
            joinedload(CallerAgent.elevenlabs_connection),
        )
        .filter(CallerAgent.id == agent_id, CallerAgent.user_id == user_id)
        .first()
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Caller agent not found"
        )
    return agent


def list_caller_agents(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse[CallerAgentResponse]:
    query = (
        db.query(CallerAgent)
        .options(
            joinedload(CallerAgent.phone_number),
            joinedload(CallerAgent.twilio_connection),
            joinedload(CallerAgent.elevenlabs_connection),
        )
        .filter(CallerAgent.user_id == user.id)
        .order_by(CallerAgent.created_at.desc())
    )
    total = query.count()
    agents = query.offset((page - 1) * page_size).limit(page_size).all()

    responses = []
    for agent in agents:
        response = _caller_agent_response(agent)
        try:
            api_key = _get_decrypted_api_key(agent.elevenlabs_connection)
            el_agents = list_agents(api_key)
            match = next(
                (
                    item
                    for item in el_agents
                    if item.agent_id == agent.elevenlabs_agent_id
                ),
                None,
            )
            if match:
                response = response.model_copy(
                    update={"elevenlabs_agent_name": match.name}
                )
        except (ElevenLabsClientError, EncryptionError):
            pass
        responses.append(response)
    return PaginatedResponse(
        items=responses,
        total=total,
        page=page,
        page_size=page_size,
    )


def create_caller_agent(
    db: Session,
    user: User,
    payload: CreateCallerAgentRequest,
) -> CallerAgentResponse:
    twilio_connection = _get_connection_by_id_or_404(
        db, user.id, payload.twilio_connection_id
    )
    elevenlabs_connection = get_elevenlabs_connection_for_user(
        db,
        user.id,
        payload.elevenlabs_connection_id,
    )

    phone_number = (
        db.query(PhoneNumber)
        .filter(
            PhoneNumber.id == payload.phone_number_id,
            PhoneNumber.user_id == user.id,
            PhoneNumber.twilio_connection_id == payload.twilio_connection_id,
        )
        .first()
    )
    if not phone_number:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found for the selected telephone provider",
        )

    existing = (
        db.query(CallerAgent)
        .filter(CallerAgent.phone_number_id == payload.phone_number_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This phone number is already used by another caller agent",
        )

    if (
        phone_number.elevenlabs_connection_id
        and phone_number.elevenlabs_connection_id != payload.elevenlabs_connection_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is registered with a different ElevenLabs account",
        )

    el_agents = []
    try:
        api_key = _get_decrypted_api_key(elevenlabs_connection)
        el_agents = list_agents(api_key)
        if not any(item.agent_id == payload.elevenlabs_agent_id for item in el_agents):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ElevenLabs agent not found on the selected account",
            )

        if not phone_number.elevenlabs_phone_number_id:
            twilio_auth_token = _get_decrypted_auth_token(twilio_connection)
            result = import_phone_number(
                api_key,
                phone_number.phone_number,
                twilio_connection.account_sid,
                twilio_auth_token,
                phone_number.label or phone_number.phone_number,
            )
            phone_number.elevenlabs_connection_id = elevenlabs_connection.id
            phone_number.elevenlabs_phone_number_id = result.phone_number_id

        update_phone_number_agent(
            api_key,
            phone_number.elevenlabs_phone_number_id,
            payload.elevenlabs_agent_id,
        )
    except ElevenLabsClientError as exc:
        _handle_elevenlabs_error(exc)
    except EncryptionError as exc:
        _handle_encryption_error(exc)

    agent = CallerAgent(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=payload.name,
        twilio_connection_id=payload.twilio_connection_id,
        phone_number_id=payload.phone_number_id,
        elevenlabs_connection_id=payload.elevenlabs_connection_id,
        elevenlabs_agent_id=payload.elevenlabs_agent_id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)

    agent.phone_number = phone_number
    agent.twilio_connection = twilio_connection
    agent.elevenlabs_connection = elevenlabs_connection

    response = _caller_agent_response(agent)
    el_match = next(
        (item for item in el_agents if item.agent_id == payload.elevenlabs_agent_id),
        None,
    )
    if el_match:
        response = response.model_copy(update={"elevenlabs_agent_name": el_match.name})
    return response


def delete_caller_agent(db: Session, user: User, agent_id: str) -> None:
    agent = _get_caller_agent_by_id_or_404(db, user.id, agent_id)

    if agent.phone_number and agent.phone_number.elevenlabs_phone_number_id:
        try:
            api_key = _get_decrypted_api_key(agent.elevenlabs_connection)
            update_phone_number_agent(
                api_key,
                agent.phone_number.elevenlabs_phone_number_id,
                None,
            )
        except (ElevenLabsClientError, EncryptionError):
            pass

    db.delete(agent)
    db.commit()
