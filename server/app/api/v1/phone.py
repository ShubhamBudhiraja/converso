from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.connection import get_db
from app.models.user import User
from app.schemas.phone import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    MessageResponse,
    NumberType,
    PhoneNumberResponse,
    PurchasePhoneNumberRequest,
    SavePhoneNumberRequest,
    TwilioAccountNumberResponse,
    TwilioAvailableNumberResponse,
    TwilioConnectionResponse,
    TwilioCredentialsRequest,
    TwilioTestRequest,
    TwilioTestResponse,
    UpdateTwilioConnectionRequest,
)
from app.services import phone as phone_service

router = APIRouter()


@router.get("/twilio/connections", response_model=list[TwilioConnectionResponse])
def list_twilio_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.list_twilio_connections(db, current_user)


@router.post(
    "/twilio/connections",
    response_model=TwilioConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_twilio_connection(
    payload: TwilioCredentialsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.create_twilio_connection(db, current_user, payload)


@router.post("/twilio/connections/test", response_model=TwilioTestResponse)
def test_unsaved_twilio_credentials(
    payload: TwilioTestRequest,
    current_user: User = Depends(get_current_user),
):
    if not (payload.account_sid and payload.auth_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both account_sid and auth_token are required",
        )
    return phone_service.test_unsaved_twilio_credentials(
        payload.account_sid,
        payload.auth_token,
    )


@router.post("/twilio/connections/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_twilio_connections(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.bulk_delete_twilio_connections(db, current_user, payload.ids)


@router.get("/twilio/connections/{connection_id}", response_model=TwilioConnectionResponse)
def get_twilio_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.get_twilio_connection(db, current_user, connection_id)


@router.put("/twilio/connections/{connection_id}", response_model=TwilioConnectionResponse)
def update_twilio_connection(
    connection_id: str,
    payload: UpdateTwilioConnectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.update_twilio_connection(db, current_user, connection_id, payload)


@router.delete("/twilio/connections/{connection_id}", response_model=MessageResponse)
def delete_twilio_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    phone_service.delete_twilio_connection(db, current_user, connection_id)
    return MessageResponse(message="Twilio connection removed")


@router.post(
    "/twilio/connections/{connection_id}/test",
    response_model=TwilioTestResponse,
)
def test_twilio_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.test_twilio_connection(db, current_user, connection_id)


@router.get(
    "/twilio/connections/{connection_id}/numbers",
    response_model=list[TwilioAccountNumberResponse],
)
def list_twilio_account_numbers(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.list_account_phone_numbers(db, current_user, connection_id)


@router.get(
    "/twilio/connections/{connection_id}/available",
    response_model=list[TwilioAvailableNumberResponse],
)
def list_available_twilio_numbers(
    connection_id: str,
    country: str = Query(default="US", min_length=2, max_length=2),
    area_code: Optional[str] = Query(default=None, min_length=3, max_length=5),
    number_type: NumberType = Query(default="local"),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.list_available_phone_numbers(
        db,
        current_user,
        connection_id,
        country_code=country,
        area_code=area_code,
        number_type=number_type,
        limit=limit,
    )


@router.get("/numbers", response_model=list[PhoneNumberResponse])
def list_saved_phone_numbers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.list_saved_phone_numbers(db, current_user)


@router.post("/numbers", response_model=PhoneNumberResponse, status_code=status.HTTP_201_CREATED)
def save_phone_number(
    payload: SavePhoneNumberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.save_phone_number(db, current_user, payload)


@router.post("/numbers/purchase", response_model=PhoneNumberResponse, status_code=status.HTTP_201_CREATED)
def purchase_phone_number(
    payload: PurchasePhoneNumberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.purchase_phone_number(db, current_user, payload)


@router.post("/numbers/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_phone_numbers(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.bulk_delete_phone_numbers(db, current_user, payload.ids)


@router.get("/numbers/{phone_number_id}", response_model=PhoneNumberResponse)
def get_saved_phone_number(
    phone_number_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return phone_service.get_saved_phone_number(db, current_user, phone_number_id)


@router.delete("/numbers/{phone_number_id}", response_model=MessageResponse)
def delete_saved_phone_number(
    phone_number_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    phone_service.delete_saved_phone_number(db, current_user, phone_number_id)
    return MessageResponse(message="Phone number removed")
