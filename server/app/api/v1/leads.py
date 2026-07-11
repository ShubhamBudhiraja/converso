from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.lead import LeadResponse, LeadStatisticsResponse
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PaginatedResponse
from app.services import leads as leads_service

router = APIRouter()


@router.get("/statistics", response_model=LeadStatisticsResponse)
def get_lead_statistics(
    campaign_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leads_service.get_lead_statistics(db, current_user, campaign_id)


@router.get("", response_model=PaginatedResponse[LeadResponse])
def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    status: Optional[str] = Query(default=None),
    campaign_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leads_service.list_leads(
        db,
        current_user,
        page,
        page_size,
        status_filter=status,
        campaign_id=campaign_id,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leads_service.get_lead(db, current_user, lead_id)
