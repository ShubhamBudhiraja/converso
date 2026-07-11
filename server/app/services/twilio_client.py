from dataclasses import dataclass
from typing import Optional

from twilio.base.exceptions import TwilioException, TwilioRestException
from twilio.rest import Client


@dataclass
class TwilioAccountInfo:
    friendly_name: str
    status: str


@dataclass
class TwilioPhoneNumberInfo:
    sid: str
    phone_number: str
    friendly_name: Optional[str]
    voice_enabled: bool
    sms_enabled: bool


@dataclass
class TwilioAvailableNumberInfo:
    phone_number: str
    friendly_name: Optional[str]
    locality: Optional[str]
    region: Optional[str]
    country_code: str
    voice_enabled: bool
    sms_enabled: bool
    mms_enabled: bool


class TwilioClientError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


def _create_client(account_sid: str, auth_token: str) -> Client:
    return Client(account_sid, auth_token)


def test_twilio_credentials(account_sid: str, auth_token: str) -> TwilioAccountInfo:
    try:
        client = _create_client(account_sid, auth_token)
        account = client.api.accounts(account_sid).fetch()
        return TwilioAccountInfo(
            friendly_name=account.friendly_name or "",
            status=account.status or "unknown",
        )
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError(
                "Invalid Twilio Account SID or Auth Token", 401
            ) from exc
        raise TwilioClientError(
            exc.msg or "Failed to connect to Twilio", exc.status
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc


def list_twilio_phone_numbers(
    account_sid: str, auth_token: str
) -> list[TwilioPhoneNumberInfo]:
    try:
        client = _create_client(account_sid, auth_token)
        numbers = client.incoming_phone_numbers.list(limit=200)
        return [
            TwilioPhoneNumberInfo(
                sid=number.sid,
                phone_number=number.phone_number,
                friendly_name=number.friendly_name,
                voice_enabled=bool(number.capabilities.get("voice")),
                sms_enabled=bool(number.capabilities.get("SMS")),
            )
            for number in numbers
        ]
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError("Invalid Twilio credentials", 401) from exc
        raise TwilioClientError(
            exc.msg or "Failed to list Twilio phone numbers", exc.status
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc


def find_twilio_phone_number(
    account_sid: str,
    auth_token: str,
    phone_number: str,
) -> Optional[TwilioPhoneNumberInfo]:
    try:
        client = _create_client(account_sid, auth_token)
        numbers = client.incoming_phone_numbers.list(phone_number=phone_number, limit=1)
        if not numbers:
            return None

        number = numbers[0]
        return TwilioPhoneNumberInfo(
            sid=number.sid,
            phone_number=number.phone_number,
            friendly_name=number.friendly_name,
            voice_enabled=bool(number.capabilities.get("voice")),
            sms_enabled=bool(number.capabilities.get("SMS")),
        )
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError("Invalid Twilio credentials", 401) from exc
        raise TwilioClientError(
            exc.msg or "Failed to look up phone number in Twilio", exc.status
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc


def list_available_twilio_phone_numbers(
    account_sid: str,
    auth_token: str,
    country_code: str = "US",
    area_code: Optional[str] = None,
    number_type: str = "local",
    limit: int = 20,
) -> list[TwilioAvailableNumberInfo]:
    try:
        client = _create_client(account_sid, auth_token)
        search_options: dict = {"limit": min(limit, 50)}

        if area_code:
            search_options["area_code"] = area_code

        available = client.available_phone_numbers(country_code)
        if number_type == "toll_free":
            numbers = available.toll_free.list(**search_options)
        elif number_type == "mobile":
            numbers = available.mobile.list(**search_options)
        else:
            numbers = available.local.list(**search_options)

        return [
            TwilioAvailableNumberInfo(
                phone_number=number.phone_number,
                friendly_name=number.friendly_name,
                locality=getattr(number, "locality", None),
                region=getattr(number, "region", None),
                country_code=country_code,
                voice_enabled=bool(number.capabilities.get("voice")),
                sms_enabled=bool(number.capabilities.get("SMS")),
                mms_enabled=bool(number.capabilities.get("MMS")),
            )
            for number in numbers
        ]
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError("Invalid Twilio credentials", 401) from exc
        raise TwilioClientError(
            exc.msg or "Failed to search available phone numbers",
            exc.status,
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc


def purchase_twilio_phone_number(
    account_sid: str,
    auth_token: str,
    phone_number: str,
    friendly_name: Optional[str] = None,
) -> TwilioPhoneNumberInfo:
    try:
        client = _create_client(account_sid, auth_token)
        create_kwargs: dict = {"phone_number": phone_number}
        if friendly_name:
            create_kwargs["friendly_name"] = friendly_name

        purchased = client.incoming_phone_numbers.create(**create_kwargs)
        return TwilioPhoneNumberInfo(
            sid=purchased.sid,
            phone_number=purchased.phone_number,
            friendly_name=purchased.friendly_name,
            voice_enabled=bool(purchased.capabilities.get("voice")),
            sms_enabled=bool(purchased.capabilities.get("SMS")),
        )
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError("Invalid Twilio credentials", 401) from exc
        raise TwilioClientError(
            exc.msg or "Failed to purchase phone number from Twilio",
            exc.status,
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc


def configure_status_webhook(
    account_sid: str,
    auth_token: str,
    phone_sid: str,
    status_callback_url: str,
) -> None:
    try:
        client = _create_client(account_sid, auth_token)
        client.incoming_phone_numbers(phone_sid).update(
            status_callback=status_callback_url,
            status_callback_method="POST",
        )
    except TwilioRestException as exc:
        if exc.status == 401:
            raise TwilioClientError("Invalid Twilio credentials", 401) from exc
        raise TwilioClientError(
            exc.msg or "Failed to configure Twilio status webhook",
            exc.status,
        ) from exc
    except TwilioException as exc:
        raise TwilioClientError(str(exc)) from exc
