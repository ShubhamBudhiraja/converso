from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.caller_agent import CallerAgentResponse, CreateCallerAgentRequest
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PaginatedResponse
from app.schemas.phone import MessageResponse
from app.services import caller_agents as caller_agents_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CallerAgentResponse])
def list_caller_agents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return caller_agents_service.list_caller_agents(db, current_user, page, page_size)


@router.post(
    "", response_model=CallerAgentResponse, status_code=status.HTTP_201_CREATED
)
def create_caller_agent(
    payload: CreateCallerAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return caller_agents_service.create_caller_agent(db, current_user, payload)


@router.delete("/{agent_id}", response_model=MessageResponse)
def delete_caller_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    caller_agents_service.delete_caller_agent(db, current_user, agent_id)
    return MessageResponse(message="Caller agent deleted")
