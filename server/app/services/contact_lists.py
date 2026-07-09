import csv
import io
import json
import re
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.contact_list import ContactList
from app.models.user import User
from app.schemas.campaign import ContactListResponse, ContactResponse, ImportContactListRequest
from app.schemas.pagination import PaginatedResponse, slice_page

PHONE_PATTERN = re.compile(r"^[\+]?[1-9][\d]{0,15}$")


def _contact_list_response(contact_list: ContactList) -> ContactListResponse:
    return ContactListResponse(
        id=contact_list.id,
        name=contact_list.name,
        first_name_column=contact_list.first_name_column,
        last_name_column=contact_list.last_name_column,
        phone_number_column=contact_list.phone_number_column,
        address_column=contact_list.address_column,
        second_phone_column=contact_list.second_phone_column,
        country_code=contact_list.country_code,
        total_contacts=contact_list.total_contacts,
        processed_contacts=contact_list.processed_contacts,
        failed_contacts=contact_list.failed_contacts,
        status=contact_list.status,
        created_at=contact_list.created_at,
        updated_at=contact_list.updated_at,
    )


def _contact_response(contact: Contact) -> ContactResponse:
    return ContactResponse(
        id=contact.id,
        contact_list_id=contact.contact_list_id,
        first_name=contact.first_name,
        last_name=contact.last_name,
        phone_number=contact.phone_number,
        address=contact.address,
        second_phone_number=contact.second_phone_number,
        country_code=contact.country_code,
        row_number=contact.row_number,
        created_at=contact.created_at,
    )


def _normalize_phone(raw: str, country_code: str) -> Optional[str]:
    cleaned = re.sub(r"[\s\-\(\)]", "", raw.strip())
    if not cleaned:
        return None
    if cleaned.startswith("+"):
        phone = cleaned
    elif cleaned.startswith("00"):
        phone = f"+{cleaned[2:]}"
    else:
        cc = country_code if country_code.startswith("+") else f"+{country_code}"
        phone = f"{cc}{cleaned.lstrip('0')}"
    if PHONE_PATTERN.match(phone):
        return phone
    return None


def _get_contact_list_or_404(db: Session, user_id: str, list_id: str) -> ContactList:
    contact_list = (
        db.query(ContactList)
        .filter(ContactList.id == list_id, ContactList.user_id == user_id)
        .first()
    )
    if not contact_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact list not found")
    return contact_list


def list_contact_lists(
    db: Session,
    user: User,
    page: int,
    page_size: int,
) -> PaginatedResponse[ContactListResponse]:
    query = (
        db.query(ContactList)
        .filter(ContactList.user_id == user.id)
        .order_by(ContactList.created_at.desc())
    )
    all_lists = query.all()
    items, total = slice_page(all_lists, page, page_size)
    return PaginatedResponse(
        items=[_contact_list_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_contact_list(db: Session, user: User, list_id: str) -> ContactListResponse:
    return _contact_list_response(_get_contact_list_or_404(db, user.id, list_id))


def list_contacts(
    db: Session,
    user: User,
    list_id: str,
    page: int,
    page_size: int,
) -> PaginatedResponse[ContactResponse]:
    _get_contact_list_or_404(db, user.id, list_id)
    query = (
        db.query(Contact)
        .filter(Contact.contact_list_id == list_id)
        .order_by(Contact.row_number.asc())
    )
    all_contacts = query.all()
    items, total = slice_page(all_contacts, page, page_size)
    return PaginatedResponse(
        items=[_contact_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


def delete_contact_list(db: Session, user: User, list_id: str) -> None:
    contact_list = _get_contact_list_or_404(db, user.id, list_id)
    db.delete(contact_list)
    db.commit()


def import_contact_list(
    db: Session,
    user: User,
    payload: ImportContactListRequest,
    file: UploadFile,
) -> ContactListResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A CSV file is required")

    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty")
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file must be 5MB or smaller")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be UTF-8 encoded",
        ) from exc

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file has no headers")

    required_columns = {
        payload.first_name_column,
        payload.last_name_column,
        payload.phone_number_column,
    }
    missing = [column for column in required_columns if column not in reader.fieldnames]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV is missing required columns: {', '.join(missing)}",
        )

    contact_list = ContactList(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=payload.name,
        first_name_column=payload.first_name_column,
        last_name_column=payload.last_name_column,
        phone_number_column=payload.phone_number_column,
        address_column=payload.address_column,
        second_phone_column=payload.second_phone_column,
        country_code=payload.country_code,
        status="processing",
    )
    db.add(contact_list)
    db.flush()

    contacts: list[Contact] = []
    failed_rows = 0
    row_number = 1

    for row in reader:
        row_number += 1
        phone_raw = (row.get(payload.phone_number_column) or "").strip()
        phone_number = _normalize_phone(phone_raw, payload.country_code)
        if not phone_number:
            failed_rows += 1
            continue

        second_phone = None
        if payload.second_phone_column:
            second_raw = (row.get(payload.second_phone_column) or "").strip()
            if second_raw:
                second_phone = _normalize_phone(second_raw, payload.country_code)

        contacts.append(
            Contact(
                id=str(uuid.uuid4()),
                contact_list_id=contact_list.id,
                first_name=(row.get(payload.first_name_column) or "").strip() or None,
                last_name=(row.get(payload.last_name_column) or "").strip() or None,
                phone_number=phone_number,
                address=(row.get(payload.address_column) or "").strip() or None
                if payload.address_column
                else None,
                second_phone_number=second_phone,
                country_code=payload.country_code,
                row_number=row_number,
            )
        )

    if not contacts:
        contact_list.status = "failed"
        contact_list.failed_contacts = failed_rows
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid contacts found in CSV",
        )

    db.bulk_save_objects(contacts)
    contact_list.total_contacts = len(contacts)
    contact_list.processed_contacts = len(contacts)
    contact_list.failed_contacts = failed_rows
    contact_list.status = "completed"
    db.commit()
    db.refresh(contact_list)
    return _contact_list_response(contact_list)
