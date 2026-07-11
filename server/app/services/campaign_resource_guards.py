import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.caller_agent import CallerAgent
from app.models.campaign import Campaign


def _campaign_names(campaigns: list[Campaign]) -> str:
    names = [f'"{campaign.name}"' for campaign in campaigns[:3]]
    if len(campaigns) > 3:
        names.append(f"{len(campaigns) - 3} more")
    return ", ".join(names)


def _raise_if_used(
    campaigns: list[Campaign],
    resource_label: str,
    action: str,
) -> None:
    if not campaigns:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"This {resource_label} is used by campaign "
            f"{_campaign_names(campaigns)} and cannot be {action}."
        ),
    )


def _campaigns_for_caller_agent_ids(
    db: Session,
    user_id: str,
    caller_agent_ids: list[str],
) -> list[Campaign]:
    if not caller_agent_ids:
        return []
    return (
        db.query(Campaign)
        .filter(
            Campaign.user_id == user_id,
            Campaign.caller_agent_id.in_(caller_agent_ids),
        )
        .all()
    )


def assert_caller_agent_not_used_by_campaign(
    db: Session,
    user_id: str,
    caller_agent_id: str,
    *,
    action: str = "deleted",
) -> None:
    campaigns = (
        db.query(Campaign)
        .filter(
            Campaign.user_id == user_id,
            Campaign.caller_agent_id == caller_agent_id,
        )
        .all()
    )
    _raise_if_used(campaigns, "caller agent", action)


def assert_phone_number_not_used_by_campaign(
    db: Session,
    user_id: str,
    phone_number_id: str,
    *,
    action: str = "deleted",
) -> None:
    caller_agent = (
        db.query(CallerAgent.id)
        .filter(
            CallerAgent.user_id == user_id,
            CallerAgent.phone_number_id == phone_number_id,
        )
        .first()
    )
    if not caller_agent:
        return

    campaigns = _campaigns_for_caller_agent_ids(db, user_id, [caller_agent[0]])
    _raise_if_used(campaigns, "phone number", action)


def assert_elevenlabs_agent_not_used_by_campaign(
    db: Session,
    user_id: str,
    connection_id: str,
    agent_id: str,
    *,
    action: str = "modified",
) -> None:
    caller_agent_ids = [
        row[0]
        for row in db.query(CallerAgent.id)
        .filter(
            CallerAgent.user_id == user_id,
            CallerAgent.elevenlabs_connection_id == connection_id,
            CallerAgent.elevenlabs_agent_id == agent_id,
        )
        .all()
    ]
    campaigns = _campaigns_for_caller_agent_ids(db, user_id, caller_agent_ids)
    _raise_if_used(campaigns, "AI agent", action)


def assert_twilio_connection_not_used_by_campaign(
    db: Session,
    user_id: str,
    connection_id: str,
    *,
    action: str = "modified",
) -> None:
    caller_agent_ids = [
        row[0]
        for row in db.query(CallerAgent.id)
        .filter(
            CallerAgent.user_id == user_id,
            CallerAgent.twilio_connection_id == connection_id,
        )
        .all()
    ]
    campaigns = _campaigns_for_caller_agent_ids(db, user_id, caller_agent_ids)
    _raise_if_used(campaigns, "telephone provider", action)


def assert_elevenlabs_connection_not_used_by_campaign(
    db: Session,
    user_id: str,
    connection_id: str,
    *,
    action: str = "modified",
) -> None:
    caller_agent_ids = [
        row[0]
        for row in db.query(CallerAgent.id)
        .filter(
            CallerAgent.user_id == user_id,
            CallerAgent.elevenlabs_connection_id == connection_id,
        )
        .all()
    ]
    campaigns = _campaigns_for_caller_agent_ids(db, user_id, caller_agent_ids)
    _raise_if_used(campaigns, "AI provider", action)


def assert_contact_list_not_used_by_campaign(
    db: Session,
    user_id: str,
    list_id: str,
    *,
    action: str = "modified",
) -> None:
    campaigns = db.query(Campaign).filter(Campaign.user_id == user_id).all()
    using: list[Campaign] = []
    for campaign in campaigns:
        try:
            list_ids = json.loads(campaign.list_ids)
        except json.JSONDecodeError:
            continue
        if list_id in list_ids:
            using.append(campaign)
    _raise_if_used(using, "contact list", action)
