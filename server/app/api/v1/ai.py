from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.ai import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    CreateElevenLabsAgentRequest,
    ElevenLabsAgentDetailResponse,
    ElevenLabsAgentResponse,
    ElevenLabsConnectionResponse,
    ElevenLabsCredentialsRequest,
    ElevenLabsTestRequest,
    ElevenLabsTestResponse,
    ElevenLabsVoiceResponse,
    MessageResponse,
    UpdateElevenLabsAgentRequest,
    UpdateElevenLabsConnectionRequest,
)
from app.services import ai as ai_service

router = APIRouter()


@router.get("/elevenlabs/connections", response_model=list[ElevenLabsConnectionResponse])
def list_elevenlabs_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.list_elevenlabs_connections(db, current_user)


@router.post(
    "/elevenlabs/connections",
    response_model=ElevenLabsConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_elevenlabs_connection(
    payload: ElevenLabsCredentialsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.create_elevenlabs_connection(db, current_user, payload)


@router.post("/elevenlabs/connections/test", response_model=ElevenLabsTestResponse)
def test_unsaved_elevenlabs_credentials(
    payload: ElevenLabsTestRequest,
    current_user: User = Depends(get_current_user),
):
    if not payload.api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="api_key is required",
        )
    return ai_service.test_unsaved_elevenlabs_credentials(payload.api_key)


@router.post("/elevenlabs/connections/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_elevenlabs_connections(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.bulk_delete_elevenlabs_connections(db, current_user, payload.ids)


@router.get(
    "/elevenlabs/connections/{connection_id}",
    response_model=ElevenLabsConnectionResponse,
)
def get_elevenlabs_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.get_elevenlabs_connection(db, current_user, connection_id)


@router.put(
    "/elevenlabs/connections/{connection_id}",
    response_model=ElevenLabsConnectionResponse,
)
def update_elevenlabs_connection(
    connection_id: str,
    payload: UpdateElevenLabsConnectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.update_elevenlabs_connection(db, current_user, connection_id, payload)


@router.delete(
    "/elevenlabs/connections/{connection_id}",
    response_model=MessageResponse,
)
def delete_elevenlabs_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ai_service.delete_elevenlabs_connection(db, current_user, connection_id)
    return MessageResponse(message="ElevenLabs connection removed")


@router.post(
    "/elevenlabs/connections/{connection_id}/test",
    response_model=ElevenLabsTestResponse,
)
def test_elevenlabs_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.test_elevenlabs_connection(db, current_user, connection_id)


@router.get(
    "/elevenlabs/connections/{connection_id}/agents",
    response_model=list[ElevenLabsAgentResponse],
)
def list_elevenlabs_agents(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.list_elevenlabs_agents(db, current_user, connection_id)


@router.post(
    "/elevenlabs/connections/{connection_id}/agents",
    response_model=ElevenLabsAgentDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_elevenlabs_agent(
    connection_id: str,
    payload: CreateElevenLabsAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.create_elevenlabs_agent(db, current_user, connection_id, payload)


@router.get(
    "/elevenlabs/connections/{connection_id}/agents/{agent_id}",
    response_model=ElevenLabsAgentDetailResponse,
)
def get_elevenlabs_agent(
    connection_id: str,
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.get_elevenlabs_agent(db, current_user, connection_id, agent_id)


@router.put(
    "/elevenlabs/connections/{connection_id}/agents/{agent_id}",
    response_model=ElevenLabsAgentDetailResponse,
)
def update_elevenlabs_agent(
    connection_id: str,
    agent_id: str,
    payload: UpdateElevenLabsAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.update_elevenlabs_agent(
        db,
        current_user,
        connection_id,
        agent_id,
        payload,
    )


@router.delete(
    "/elevenlabs/connections/{connection_id}/agents/{agent_id}",
    response_model=MessageResponse,
)
def delete_elevenlabs_agent(
    connection_id: str,
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ai_service.delete_elevenlabs_agent(db, current_user, connection_id, agent_id)
    return MessageResponse(message="ElevenLabs agent deleted")


@router.get(
    "/elevenlabs/connections/{connection_id}/voices",
    response_model=list[ElevenLabsVoiceResponse],
)
def list_elevenlabs_voices(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ai_service.list_elevenlabs_voices(db, current_user, connection_id)
