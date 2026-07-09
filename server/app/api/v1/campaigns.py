from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.campaign import (
    CampaignExecutionResponse,
    CampaignResponse,
    CallResponse,
    ContactListResponse,
    ContactResponse,
    CreateCampaignRequest,
    UpdateCampaignRequest,
)
from app.schemas.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PaginatedResponse
from app.schemas.phone import MessageResponse
from app.services import campaigns as campaigns_service
from app.services import contact_lists as contact_lists_service

router = APIRouter()


@router.get("/lists", response_model=PaginatedResponse[ContactListResponse])
def list_contact_lists(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return contact_lists_service.list_contact_lists(db, current_user, page, page_size)


@router.post("/lists/import", response_model=ContactListResponse, status_code=status.HTTP_201_CREATED)
def import_contact_list(
    name: str = Form(...),
    first_name_column: str = Form(...),
    last_name_column: str = Form(...),
    phone_number_column: str = Form(...),
    address_column: Optional[str] = Form(default=None),
    second_phone_column: Optional[str] = Form(default=None),
    country_code: str = Form(default="+1"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.schemas.campaign import ImportContactListRequest

    payload = ImportContactListRequest(
        name=name,
        first_name_column=first_name_column,
        last_name_column=last_name_column,
        phone_number_column=phone_number_column,
        address_column=address_column,
        second_phone_column=second_phone_column,
        country_code=country_code,
    )
    return contact_lists_service.import_contact_list(db, current_user, payload, file)


@router.get("/lists/{list_id}", response_model=ContactListResponse)
def get_contact_list(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return contact_lists_service.get_contact_list(db, current_user, list_id)


@router.get("/lists/{list_id}/contacts", response_model=PaginatedResponse[ContactResponse])
def list_contacts(
    list_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return contact_lists_service.list_contacts(db, current_user, list_id, page, page_size)


@router.delete("/lists/{list_id}", response_model=MessageResponse)
def delete_contact_list(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact_lists_service.delete_contact_list(db, current_user, list_id)
    return MessageResponse(message="Contact list deleted")


@router.get("", response_model=PaginatedResponse[CampaignResponse])
def list_campaigns(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.list_campaigns(db, current_user, page, page_size)


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CreateCampaignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.create_campaign(db, current_user, payload)


@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.get_campaign(db, current_user, campaign_id)


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: str,
    payload: UpdateCampaignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.update_campaign(db, current_user, campaign_id, payload)


@router.delete("/{campaign_id}", response_model=MessageResponse)
def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns_service.delete_campaign(db, current_user, campaign_id)
    return MessageResponse(message="Campaign deleted")


@router.post("/{campaign_id}/cancel", response_model=CampaignResponse)
def cancel_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.cancel_campaign(db, current_user, campaign_id)


@router.post("/{campaign_id}/start", response_model=CampaignResponse)
def start_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.trigger_campaign_start(db, current_user, campaign_id)


@router.get("/{campaign_id}/calls", response_model=PaginatedResponse[CallResponse])
def list_campaign_calls(
    campaign_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return campaigns_service.list_campaign_calls(db, current_user, campaign_id, page, page_size)
