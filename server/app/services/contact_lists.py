import csv
import io
import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.contact_list import ContactList
from app.models.user import User
from app.schemas.campaign import (
    ContactListImportErrorGroup,
    ContactListResponse,
    ContactListValidationResponse,
    ContactResponse,
    ImportContactListRequest,
)
from app.schemas.pagination import PaginatedResponse, slice_page
from app.services.campaign_resource_guards import assert_contact_list_not_used_by_campaign

PHONE_PATTERN = re.compile(r"^[\+]?[1-9][\d]{0,15}$")


class ContactListImportValidationError(Exception):
    def __init__(self, validation: ContactListValidationResponse):
        self.validation = validation
        super().__init__("CSV validation failed")


@dataclass
class ParsedContactDraft:
    row_number: int
    first_name: str
    last_name: Optional[str]
    phone_number: str
    address: Optional[str]
    second_phone_number: Optional[str]


@dataclass
class CsvParseResult:
    valid_contacts: list[ParsedContactDraft] = field(default_factory=list)
    no_contact_rows: list[int] = field(default_factory=list)
    no_first_name_rows: list[int] = field(default_factory=list)
    total_rows: int = 0


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


def _read_csv_text(file: UploadFile) -> str:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A CSV file is required"
        )

    raw = file.file.read()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty"
        )
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be 5MB or smaller",
        )

    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must be UTF-8 encoded",
        ) from exc


def _validate_csv_columns(
    payload: ImportContactListRequest, fieldnames: list[str]
) -> None:
    required_columns = {
        payload.first_name_column,
        payload.last_name_column,
        payload.phone_number_column,
    }
    missing = [column for column in required_columns if column not in fieldnames]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV is missing required columns: {', '.join(missing)}",
        )


def _parse_csv_rows(payload: ImportContactListRequest, text: str) -> CsvParseResult:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file has no headers"
        )

    _validate_csv_columns(payload, reader.fieldnames)

    result = CsvParseResult()
    row_number = 0

    for row in reader:
        row_number += 1
        result.total_rows += 1

        first_name = (row.get(payload.first_name_column) or "").strip()
        last_name = (row.get(payload.last_name_column) or "").strip() or None
        phone_raw = (row.get(payload.phone_number_column) or "").strip()
        phone_number = _normalize_phone(phone_raw, payload.country_code)

        missing_phone = not phone_number
        missing_first_name = not first_name

        if missing_phone:
            result.no_contact_rows.append(row_number)
        if missing_first_name:
            result.no_first_name_rows.append(row_number)
        if missing_phone or missing_first_name:
            continue

        second_phone = None
        if payload.second_phone_column:
            second_raw = (row.get(payload.second_phone_column) or "").strip()
            if second_raw:
                second_phone = _normalize_phone(second_raw, payload.country_code)

        result.valid_contacts.append(
            ParsedContactDraft(
                row_number=row_number,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                address=(
                    (row.get(payload.address_column) or "").strip() or None
                    if payload.address_column
                    else None
                ),
                second_phone_number=second_phone,
            )
        )

    return result


def _build_validation_response(
    parse_result: CsvParseResult,
) -> ContactListValidationResponse:
    error_groups: list[ContactListImportErrorGroup] = []
    if parse_result.no_contact_rows:
        error_groups.append(
            ContactListImportErrorGroup(
                label="No contact found",
                rows=parse_result.no_contact_rows,
            )
        )
    if parse_result.no_first_name_rows:
        error_groups.append(
            ContactListImportErrorGroup(
                label="No first name found",
                rows=parse_result.no_first_name_rows,
            )
        )

    return ContactListValidationResponse(
        valid_count=len(parse_result.valid_contacts),
        total_rows=parse_result.total_rows,
        error_groups=error_groups,
        can_import_partial=bool(parse_result.valid_contacts),
    )


def _get_contact_list_or_404(db: Session, user_id: str, list_id: str) -> ContactList:
    contact_list = (
        db.query(ContactList)
        .filter(ContactList.id == list_id, ContactList.user_id == user_id)
        .first()
    )
    if not contact_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact list not found"
        )
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
    assert_contact_list_not_used_by_campaign(
        db, user.id, list_id, action="deleted"
    )
    db.delete(contact_list)
    db.commit()


def update_contact_list(
    db: Session,
    user: User,
    list_id: str,
    name: str,
) -> ContactListResponse:
    contact_list = _get_contact_list_or_404(db, user.id, list_id)
    assert_contact_list_not_used_by_campaign(db, user.id, list_id)
    contact_list.name = name.strip()
    db.commit()
    db.refresh(contact_list)
    return _contact_list_response(contact_list)


def _safe_csv_filename(name: str) -> str:
    safe = re.sub(r"[^\w\-]+", "-", name.strip()).strip("-")
    return f"{safe or 'contact-list'}.csv"


def export_contact_list_csv(db: Session, user: User, list_id: str) -> tuple[str, str]:
    contact_list = _get_contact_list_or_404(db, user.id, list_id)
    contacts = (
        db.query(Contact)
        .filter(Contact.contact_list_id == list_id)
        .order_by(Contact.row_number.asc())
        .all()
    )

    fieldnames = [
        contact_list.first_name_column,
        contact_list.last_name_column,
        contact_list.phone_number_column,
    ]
    if contact_list.address_column:
        fieldnames.append(contact_list.address_column)
    if contact_list.second_phone_column:
        fieldnames.append(contact_list.second_phone_column)

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()

    for contact in contacts:
        row = {
            contact_list.first_name_column: contact.first_name or "",
            contact_list.last_name_column: contact.last_name or "",
            contact_list.phone_number_column: contact.phone_number,
        }
        if contact_list.address_column:
            row[contact_list.address_column] = contact.address or ""
        if contact_list.second_phone_column:
            row[contact_list.second_phone_column] = contact.second_phone_number or ""
        writer.writerow(row)

    return _safe_csv_filename(contact_list.name), buffer.getvalue()


def import_contact_list(
    db: Session,
    user: User,
    payload: ImportContactListRequest,
    file: UploadFile,
    *,
    accept_partial: bool = False,
) -> ContactListResponse:
    text = _read_csv_text(file)
    parse_result = _parse_csv_rows(payload, text)
    validation = _build_validation_response(parse_result)
    has_errors = bool(validation.error_groups)

    if has_errors and not accept_partial:
        raise ContactListImportValidationError(validation)

    if not parse_result.valid_contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid contacts found in CSV",
        )

    invalid_rows = {
        *parse_result.no_contact_rows,
        *parse_result.no_first_name_rows,
    }

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

    contacts = [
        Contact(
            id=str(uuid.uuid4()),
            contact_list_id=contact_list.id,
            first_name=draft.first_name,
            last_name=draft.last_name,
            phone_number=draft.phone_number,
            address=draft.address,
            second_phone_number=draft.second_phone_number,
            country_code=payload.country_code,
            row_number=draft.row_number,
        )
        for draft in parse_result.valid_contacts
    ]

    db.bulk_save_objects(contacts)
    contact_list.total_contacts = len(contacts)
    contact_list.processed_contacts = len(contacts)
    contact_list.failed_contacts = len(invalid_rows)
    contact_list.status = "completed"
    db.commit()
    db.refresh(contact_list)
    return _contact_list_response(contact_list)
