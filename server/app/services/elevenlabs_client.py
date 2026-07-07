from dataclasses import dataclass
from typing import Any, Optional

import httpx

ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1"
REQUEST_TIMEOUT = 30.0


@dataclass
class ElevenLabsUserInfo:
    subscription_tier: Optional[str]
    character_count: Optional[int]
    character_limit: Optional[int]


@dataclass
class ElevenLabsAgentInfo:
    agent_id: str
    name: str
    created_at_unix_secs: Optional[int] = None


@dataclass
class ElevenLabsVoiceInfo:
    voice_id: str
    name: str
    language: str
    gender: str
    accent: Optional[str] = None
    description: Optional[str] = None


@dataclass
class ElevenLabsPhoneNumberInfo:
    phone_number_id: str


class ElevenLabsClientError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


def _headers(api_key: str) -> dict[str, str]:
    return {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }


def _parse_error(response: httpx.Response) -> str:
    try:
        data = response.json()
        detail = data.get("detail")
        if isinstance(detail, dict):
            return detail.get("message") or detail.get("status") or str(detail)
        if isinstance(detail, str):
            return detail
        if "message" in data:
            return str(data["message"])
    except Exception:
        pass
    return response.text or "ElevenLabs API request failed"


def _handle_response(response: httpx.Response) -> Any:
    if response.status_code == 401:
        raise ElevenLabsClientError("Invalid ElevenLabs API key", 401)
    if response.status_code == 404:
        raise ElevenLabsClientError("ElevenLabs resource not found", 404)
    if 400 <= response.status_code < 500:
        raise ElevenLabsClientError(_parse_error(response), response.status_code)
    if response.status_code >= 500:
        raise ElevenLabsClientError("ElevenLabs service is temporarily unavailable", response.status_code)
    return response.json()


def validate_api_key(api_key: str) -> ElevenLabsUserInfo:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        user_response = client.get(f"{ELEVENLABS_API_BASE}/user", headers=_headers(api_key))
        _handle_response(user_response)

        subscription_tier = None
        character_count = None
        character_limit = None

        try:
            subscription_response = client.get(
                f"{ELEVENLABS_API_BASE}/user/subscription",
                headers=_headers(api_key),
            )
            subscription_data = _handle_response(subscription_response)
            subscription_tier = subscription_data.get("tier")
            character_count = subscription_data.get("character_count")
            character_limit = subscription_data.get("character_limit")
        except ElevenLabsClientError:
            pass

        return ElevenLabsUserInfo(
            subscription_tier=subscription_tier,
            character_count=character_count,
            character_limit=character_limit,
        )


def list_agents(api_key: str) -> list[ElevenLabsAgentInfo]:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.get(
            f"{ELEVENLABS_API_BASE}/convai/agents",
            headers=_headers(api_key),
        )
        data = _handle_response(response)
        agents = data.get("agents", [])
        return [
            ElevenLabsAgentInfo(
                agent_id=agent.get("agent_id", ""),
                name=agent.get("name", "Unnamed agent"),
                created_at_unix_secs=agent.get("created_at_unix_secs"),
            )
            for agent in agents
            if agent.get("agent_id")
        ]


def get_agent(api_key: str, agent_id: str) -> dict[str, Any]:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.get(
            f"{ELEVENLABS_API_BASE}/convai/agents/{agent_id}",
            headers=_headers(api_key),
        )
        return _handle_response(response)


def list_voices(api_key: str) -> list[ElevenLabsVoiceInfo]:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.get(f"{ELEVENLABS_API_BASE}/voices", headers=_headers(api_key))
        data = _handle_response(response)
        voices = data.get("voices", [])
        return [
            ElevenLabsVoiceInfo(
                voice_id=voice.get("voice_id", ""),
                name=voice.get("name", "Unnamed voice"),
                language=(voice.get("labels") or {}).get("language", "en"),
                gender=(voice.get("labels") or {}).get("gender", "neutral"),
                accent=(voice.get("labels") or {}).get("accent"),
                description=(voice.get("labels") or {}).get("description"),
            )
            for voice in voices
            if voice.get("voice_id")
        ]


def import_phone_number(
    api_key: str,
    phone_number: str,
    twilio_account_sid: str,
    twilio_auth_token: str,
    label: str,
) -> ElevenLabsPhoneNumberInfo:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.post(
            f"{ELEVENLABS_API_BASE}/convai/phone-numbers/create",
            headers=_headers(api_key),
            json={
                "phone_number": phone_number,
                "label": label,
                "sid": twilio_account_sid,
                "token": twilio_auth_token,
            },
        )
        data = _handle_response(response)
        phone_number_id = data.get("phone_number_id")
        if not phone_number_id:
            raise ElevenLabsClientError("ElevenLabs did not return a phone number ID")
        return ElevenLabsPhoneNumberInfo(phone_number_id=phone_number_id)


def remove_phone_number(api_key: str, phone_number_id: str) -> None:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.delete(
            f"{ELEVENLABS_API_BASE}/convai/phone-numbers/{phone_number_id}",
            headers=_headers(api_key),
        )
        if response.status_code == 404:
            return
        _handle_response(response)


def update_phone_number_agent(
    api_key: str,
    phone_number_id: str,
    agent_id: Optional[str],
) -> None:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.patch(
            f"{ELEVENLABS_API_BASE}/convai/phone-numbers/{phone_number_id}",
            headers=_headers(api_key),
            json={"agent_id": agent_id},
        )
        _handle_response(response)


DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
DEFAULT_LLM = "gpt-4o-mini"
DEFAULT_TTS_MODEL = "eleven_turbo_v2"


def _default_agent_payload(
    *,
    name: str,
    system_prompt: str,
    first_message: str,
    voice_id: str,
    llm: str,
) -> dict[str, Any]:
    return {
        "name": name,
        "conversation_config": {
            "asr": {
                "quality": "high",
                "provider": "elevenlabs",
                "user_input_audio_format": "ulaw_8000",
                "keywords": [],
            },
            "turn": {
                "turn_timeout": 2,
                "silence_end_call_timeout": 35,
                "mode": "turn",
            },
            "tts": {
                "model_id": DEFAULT_TTS_MODEL,
                "voice_id": voice_id,
                "supported_voices": [],
                "agent_output_audio_format": "ulaw_8000",
                "optimize_streaming_latency": 3,
                "stability": 0.5,
                "speed": 1,
                "similarity_boost": 0.8,
                "pronunciation_dictionary_locators": [],
            },
            "conversation": {
                "text_only": False,
                "max_duration_seconds": 300,
                "client_events": [
                    "audio",
                    "interruption",
                    "user_transcript",
                    "agent_response",
                    "agent_response_correction",
                ],
            },
            "language_presets": {},
            "agent": {
                "first_message": first_message,
                "language": "en",
                "dynamic_variables": {"dynamic_variable_placeholders": {}},
                "prompt": {
                    "prompt": system_prompt,
                    "llm": llm,
                    "temperature": 0.45,
                    "max_tokens": -1,
                    "tool_ids": [],
                    "built_in_tools": {
                        "end_call": {
                            "name": "end_call",
                            "description": (
                                "Gracefully concludes the conversation and disconnects the call."
                            ),
                            "response_timeout_secs": 20,
                            "type": "system",
                            "params": {"system_tool_type": "end_call"},
                        },
                        "language_detection": None,
                        "transfer_to_agent": None,
                        "transfer_to_number": None,
                        "skip_turn": None,
                    },
                    "mcp_server_ids": [],
                    "native_mcp_server_ids": [],
                    "knowledge_base": [],
                    "custom_llm": None,
                    "ignore_default_personality": False,
                    "rag": {
                        "enabled": False,
                        "embedding_model": "e5_mistral_7b_instruct",
                        "max_vector_distance": 0.6,
                        "max_documents_length": 50000,
                        "max_retrieved_rag_chunks_count": 20,
                    },
                    "tools": [
                        {
                            "name": "end_call",
                            "description": (
                                "Gracefully concludes the conversation and disconnects the call."
                            ),
                            "response_timeout_secs": 20,
                            "type": "system",
                            "params": {"system_tool_type": "end_call"},
                        }
                    ],
                },
            },
        },
        "platform_settings": {
            "auth": {"enable_auth": True, "allowlist": [], "shareable_token": None},
            "evaluation": {"criteria": []},
            "widget": {
                "variant": "full",
                "placement": "bottom-right",
                "expandable": "never",
                "avatar": {"type": "orb", "color_1": "#2792DC", "color_2": "#9CE6E6"},
                "feedback_mode": "during",
                "bg_color": "#ffffff",
                "text_color": "#000000",
                "btn_color": "#000000",
                "btn_text_color": "#ffffff",
                "border_color": "#e1e1e1",
                "focus_color": "#000000",
                "border_radius": None,
                "btn_radius": None,
                "action_text": None,
                "start_call_text": None,
                "end_call_text": None,
                "expand_text": None,
                "listening_text": None,
                "speaking_text": None,
                "shareable_page_text": None,
                "shareable_page_show_terms": True,
                "terms_text": (
                    "By using this service, you consent to the recording and "
                    "processing of your conversation."
                ),
                "terms_html": (
                    "<p>By using this service, you consent to the recording and "
                    "processing of your conversation.</p>"
                ),
                "terms_key": None,
                "show_avatar_when_collapsed": True,
                "disable_banner": False,
                "override_link": None,
                "mic_muting_enabled": False,
                "transcript_enabled": False,
                "text_input_enabled": True,
                "text_contents": {},
                "styles": {},
                "language_selector": False,
                "supports_text_only": True,
                "custom_avatar_path": None,
                "language_presets": {},
            },
            "data_collection": {},
            "overrides": {
                "conversation_config_override": {
                    "tts": {"voice_id": True},
                    "conversation": {"text_only": False},
                    "agent": {
                        "first_message": True,
                        "language": True,
                        "prompt": {"prompt": True},
                    },
                },
                "custom_llm_extra_body": False,
                "enable_conversation_initiation_client_data_from_webhook": False,
            },
            "call_limits": {
                "agent_concurrency_limit": -1,
                "daily_limit": 100000,
                "bursting_enabled": True,
            },
            "ban": None,
            "privacy": {
                "record_voice": True,
                "retention_days": 730,
                "delete_transcript_and_pii": True,
                "delete_audio": True,
                "apply_to_existing_conversations": False,
                "zero_retention_mode": False,
            },
            "workspace_overrides": {
                "conversation_initiation_client_data_webhook": None,
                "webhooks": {},
            },
            "safety": {
                "is_blocked_ivc": False,
                "is_blocked_non_ivc": False,
                "ignore_safety_evaluation": False,
            },
        },
        "tags": [],
    }


def create_agent(
    api_key: str,
    *,
    name: str,
    system_prompt: str,
    first_message: str,
    voice_id: str,
    llm: str = DEFAULT_LLM,
) -> str:
    payload = _default_agent_payload(
        name=name,
        system_prompt=system_prompt,
        first_message=first_message,
        voice_id=voice_id,
        llm=llm,
    )
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.post(
            f"{ELEVENLABS_API_BASE}/convai/agents/create",
            headers=_headers(api_key),
            json=payload,
        )
        data = _handle_response(response)
        agent_id = data.get("agent_id")
        if not agent_id:
            raise ElevenLabsClientError("ElevenLabs did not return an agent ID")
        return agent_id


def update_agent(
    api_key: str,
    agent_id: str,
    *,
    name: Optional[str] = None,
    system_prompt: Optional[str] = None,
    first_message: Optional[str] = None,
    voice_id: Optional[str] = None,
    llm: Optional[str] = None,
) -> None:
    payload: dict[str, Any] = {}
    if name is not None:
        payload["name"] = name

    conversation_config: dict[str, Any] = {}
    agent_config: dict[str, Any] = {}
    prompt_config: dict[str, Any] = {}
    tts_config: dict[str, Any] = {}

    if first_message is not None:
        agent_config["first_message"] = first_message
    if system_prompt is not None:
        prompt_config["prompt"] = system_prompt
    if llm is not None:
        prompt_config["llm"] = llm
    if voice_id is not None:
        tts_config["voice_id"] = voice_id

    if prompt_config:
        agent_config["prompt"] = prompt_config
    if agent_config:
        conversation_config["agent"] = agent_config
    if tts_config:
        conversation_config["tts"] = tts_config
    if conversation_config:
        payload["conversation_config"] = conversation_config

    if not payload:
        return

    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.patch(
            f"{ELEVENLABS_API_BASE}/convai/agents/{agent_id}",
            headers=_headers(api_key),
            json=payload,
        )
        _handle_response(response)


def delete_agent(api_key: str, agent_id: str) -> None:
    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        response = client.delete(
            f"{ELEVENLABS_API_BASE}/convai/agents/{agent_id}",
            headers=_headers(api_key),
        )
        if response.status_code == 404:
            return
        _handle_response(response)
