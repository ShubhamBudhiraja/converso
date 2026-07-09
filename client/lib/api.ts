import {
    handleSessionExpired,
    refreshAccessToken,
    SESSION_EXPIRED_MESSAGE,
    SessionExpiredError,
    shouldRefreshOn401,
} from "@/lib/auth-session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export { SessionExpiredError };

export function getApiErrorMessage(
    err: unknown,
    fallback: string,
): string | null {
    if (err instanceof SessionExpiredError) return null;
    return err instanceof ApiError ? err.message : fallback;
}

async function parseError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        if (typeof data.detail === "string") return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail
                .map((item: { msg?: string }) => item.msg)
                .join(", ");
        }
    } catch {
        // fall through
    }
    return "Something went wrong. Please try again.";
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    hasRetried = false,
): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (response.status === 401 && !hasRetried && shouldRefreshOn401(path)) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return apiRequest<T>(path, options, true);
        }
        handleSessionExpired(SESSION_EXPIRED_MESSAGE);
    }

    if (!response.ok) {
        throw new ApiError(await parseError(response), response.status);
    }

    return response.json() as Promise<T>;
}

export type MessageResponse = {
    message: string;
};

export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    page_size: number;
};

export type PaginationParams = {
    page?: number;
    page_size?: number;
};

export const DEFAULT_PAGE_SIZE = 10;

function buildPaginationQuery(params?: PaginationParams): string {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    const query = search.toString();
    return query ? `?${query}` : "";
}

export type UserResponse = {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
};

export const authApi = {
    signup(email: string, password: string) {
        return apiRequest<MessageResponse>("/auth/signup", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    },

    login(email: string, password: string) {
        return apiRequest<MessageResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
    },

    refresh() {
        return apiRequest<MessageResponse>("/auth/refresh", {
            method: "POST",
        });
    },

    logout() {
        return apiRequest<MessageResponse>("/auth/logout", {
            method: "POST",
        });
    },

    forgotPassword(email: string) {
        return apiRequest<MessageResponse>("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
        });
    },

    resetPassword(token: string, password: string) {
        return apiRequest<MessageResponse>("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token, password }),
        });
    },

    me() {
        return apiRequest<UserResponse>("/auth/me");
    },
};

export type TwilioConnection = {
    id: string;
    account_sid_masked: string;
    auth_token_masked: string;
    label: string | null;
    is_valid: boolean;
    last_tested_at: string | null;
    phone_number_count: number;
    created_at: string;
    updated_at: string;
};

export type PhoneNumber = {
    id: string;
    twilio_connection_id: string;
    phone_number: string;
    twilio_phone_sid: string | null;
    label: string | null;
    status: string;
    elevenlabs_phone_number_id: string | null;
    elevenlabs_connection_id: string | null;
    created_at: string;
    updated_at: string;
};

export type BulkDeleteResponse = {
    deleted_count: number;
    not_found_ids: string[];
};

export type TwilioTestResponse = {
    success: boolean;
    message: string;
    account_friendly_name?: string | null;
};

export type TwilioAvailableNumber = {
    phone_number: string;
    friendly_name: string | null;
    locality: string | null;
    region: string | null;
    country_code: string;
    voice_enabled: boolean;
    sms_enabled: boolean;
    mms_enabled: boolean;
};

export type ElevenLabsConnection = {
    id: string;
    api_key_masked: string;
    label: string | null;
    is_valid: boolean;
    last_tested_at: string | null;
    agent_count: number;
    created_at: string;
    updated_at: string;
};

export type ElevenLabsAgent = {
    agent_id: string;
    name: string;
    created_at_unix_secs: number | null;
};

export type ElevenLabsAgentDetail = ElevenLabsAgent & {
    system_prompt: string | null;
    first_message: string | null;
    voice_id: string | null;
    llm: string | null;
};

export type ElevenLabsVoice = {
    voice_id: string;
    name: string;
    language: string;
    gender: string;
    accent: string | null;
    description: string | null;
};

export type ElevenLabsTestResponse = {
    success: boolean;
    message: string;
    subscription_tier?: string | null;
    character_count?: number | null;
    character_limit?: number | null;
};

export const aiProviderApi = {
    listConnections(params?: PaginationParams) {
        return apiRequest<PaginatedResponse<ElevenLabsConnection>>(
            `/ai/elevenlabs/connections${buildPaginationQuery(params)}`,
        );
    },

    getConnection(id: string) {
        return apiRequest<ElevenLabsConnection>(
            `/ai/elevenlabs/connections/${id}`,
        );
    },

    createConnection(data: { api_key: string; label?: string }) {
        return apiRequest<ElevenLabsConnection>("/ai/elevenlabs/connections", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateConnection(id: string, data: { label?: string }) {
        return apiRequest<ElevenLabsConnection>(
            `/ai/elevenlabs/connections/${id}`,
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },

    deleteConnection(id: string) {
        return apiRequest<MessageResponse>(`/ai/elevenlabs/connections/${id}`, {
            method: "DELETE",
        });
    },

    bulkDeleteConnections(ids: string[]) {
        return apiRequest<BulkDeleteResponse>(
            "/ai/elevenlabs/connections/bulk-delete",
            {
                method: "POST",
                body: JSON.stringify({ ids }),
            },
        );
    },

    testUnsavedCredentials(api_key: string) {
        return apiRequest<ElevenLabsTestResponse>(
            "/ai/elevenlabs/connections/test",
            {
                method: "POST",
                body: JSON.stringify({ api_key }),
            },
        );
    },

    testConnection(id: string) {
        return apiRequest<ElevenLabsTestResponse>(
            `/ai/elevenlabs/connections/${id}/test`,
            {
                method: "POST",
            },
        );
    },

    listAgents(connectionId: string, params?: PaginationParams) {
        return apiRequest<PaginatedResponse<ElevenLabsAgent>>(
            `/ai/elevenlabs/connections/${connectionId}/agents${buildPaginationQuery(params)}`,
        );
    },

    listVoices(connectionId: string) {
        return apiRequest<ElevenLabsVoice[]>(
            `/ai/elevenlabs/connections/${connectionId}/voices`,
        );
    },

    createAgent(
        connectionId: string,
        data: {
            name: string;
            system_prompt?: string;
            first_message?: string;
            voice_id: string;
            llm?: string;
        },
    ) {
        return apiRequest<ElevenLabsAgentDetail>(
            `/ai/elevenlabs/connections/${connectionId}/agents`,
            {
                method: "POST",
                body: JSON.stringify(data),
            },
        );
    },

    getAgent(connectionId: string, agentId: string) {
        return apiRequest<ElevenLabsAgentDetail>(
            `/ai/elevenlabs/connections/${connectionId}/agents/${agentId}`,
        );
    },

    updateAgent(
        connectionId: string,
        agentId: string,
        data: {
            name?: string;
            system_prompt?: string;
            first_message?: string;
            voice_id?: string;
            llm?: string;
        },
    ) {
        return apiRequest<ElevenLabsAgentDetail>(
            `/ai/elevenlabs/connections/${connectionId}/agents/${agentId}`,
            {
                method: "PUT",
                body: JSON.stringify(data),
            },
        );
    },

    deleteAgent(connectionId: string, agentId: string) {
        return apiRequest<MessageResponse>(
            `/ai/elevenlabs/connections/${connectionId}/agents/${agentId}`,
            {
                method: "DELETE",
            },
        );
    },
};

export type CallerAgent = {
    id: string;
    name: string;
    twilio_connection_id: string;
    twilio_connection_label: string | null;
    phone_number_id: string;
    phone_number: string;
    phone_label: string | null;
    elevenlabs_connection_id: string;
    elevenlabs_connection_label: string | null;
    elevenlabs_agent_id: string;
    elevenlabs_agent_name: string | null;
    created_at: string;
    updated_at: string;
};

export const callerAgentApi = {
    listAgents(params?: PaginationParams) {
        return apiRequest<PaginatedResponse<CallerAgent>>(
            `/agents${buildPaginationQuery(params)}`,
        );
    },

    createAgent(data: {
        name: string;
        twilio_connection_id: string;
        phone_number_id: string;
        elevenlabs_connection_id: string;
        elevenlabs_agent_id: string;
    }) {
        return apiRequest<CallerAgent>("/agents", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    deleteAgent(id: string) {
        return apiRequest<MessageResponse>(`/agents/${id}`, {
            method: "DELETE",
        });
    },
};

export type ContactListStatus = "processing" | "completed" | "failed";
export type CampaignStatus =
    | "scheduled"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
export type CallStatus =
    | "pending"
    | "initiated"
    | "ringing"
    | "in_progress"
    | "answered"
    | "completed"
    | "failed"
    | "busy"
    | "no_answer"
    | "cancelled";

export type ContactList = {
    id: string;
    name: string;
    first_name_column: string;
    last_name_column: string;
    phone_number_column: string;
    address_column: string | null;
    second_phone_column: string | null;
    country_code: string;
    total_contacts: number;
    processed_contacts: number;
    failed_contacts: number;
    status: ContactListStatus;
    created_at: string;
    updated_at: string;
};

export type Campaign = {
    id: string;
    name: string;
    status: CampaignStatus;
    caller_agent_id: string;
    caller_agent_name: string | null;
    list_ids: string[];
    list_names: string[];
    scheduled_at: string;
    timezone: string;
    retry_attempts: number;
    retry_interval: "24h" | "48h" | "72h";
    started_at: string | null;
    completed_at: string | null;
    total_contacts: number;
    calls_initiated: number;
    calls_completed: number;
    calls_failed: number;
    created_at: string;
    updated_at: string;
};

export type CampaignCall = {
    id: string;
    campaign_id: string;
    contact_id: string | null;
    contact_name: string | null;
    phone_number: string;
    direction: string;
    status: CallStatus;
    call_sid: string | null;
    conversation_id: string | null;
    transcription_summary: string | null;
    duration_seconds: number | null;
    error_message: string | null;
    retry_attempt: number;
    created_at: string;
    updated_at: string;
};

async function apiFormRequest<T>(
    path: string,
    formData: FormData,
    hasRetried = false,
): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    if (response.status === 401 && !hasRetried && shouldRefreshOn401(path)) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return apiFormRequest<T>(path, formData, true);
        }
        handleSessionExpired(SESSION_EXPIRED_MESSAGE);
    }

    if (!response.ok) {
        throw new ApiError(await parseError(response), response.status);
    }

    return response.json() as Promise<T>;
}

export const campaignApi = {
    listContactLists(params?: PaginationParams) {
        return apiRequest<PaginatedResponse<ContactList>>(
            `/campaigns/lists${buildPaginationQuery(params)}`,
        );
    },

    importContactList(data: {
        file: File;
        name: string;
        first_name_column: string;
        last_name_column: string;
        phone_number_column: string;
        address_column?: string;
        second_phone_column?: string;
        country_code?: string;
    }) {
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("name", data.name);
        formData.append("first_name_column", data.first_name_column);
        formData.append("last_name_column", data.last_name_column);
        formData.append("phone_number_column", data.phone_number_column);
        if (data.address_column) {
            formData.append("address_column", data.address_column);
        }
        if (data.second_phone_column) {
            formData.append("second_phone_column", data.second_phone_column);
        }
        formData.append("country_code", data.country_code ?? "+1");
        return apiFormRequest<ContactList>("/campaigns/lists/import", formData);
    },

    deleteContactList(id: string) {
        return apiRequest<MessageResponse>(`/campaigns/lists/${id}`, {
            method: "DELETE",
        });
    },

    listCampaigns(params?: PaginationParams) {
        return apiRequest<PaginatedResponse<Campaign>>(
            `/campaigns${buildPaginationQuery(params)}`,
        );
    },

    getCampaign(id: string) {
        return apiRequest<Campaign>(`/campaigns/${id}`);
    },

    createCampaign(data: {
        name: string;
        caller_agent_id: string;
        list_ids: string[];
        scheduled_at: string;
        schedule_settings: {
            timezone: string;
            retry_attempts: number;
            retry_interval: "24h" | "48h" | "72h";
        };
    }) {
        return apiRequest<Campaign>("/campaigns", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    cancelCampaign(id: string) {
        return apiRequest<Campaign>(`/campaigns/${id}/cancel`, {
            method: "POST",
        });
    },

    startCampaign(id: string) {
        return apiRequest<Campaign>(`/campaigns/${id}/start`, {
            method: "POST",
        });
    },

    deleteCampaign(id: string) {
        return apiRequest<MessageResponse>(`/campaigns/${id}`, {
            method: "DELETE",
        });
    },

    listCampaignCalls(id: string, params?: PaginationParams) {
        return apiRequest<PaginatedResponse<CampaignCall>>(
            `/campaigns/${id}/calls${buildPaginationQuery(params)}`,
        );
    },
};

export type NumberType = "local" | "toll_free" | "mobile";

export const phoneApi = {
    listConnections(params?: PaginationParams) {
        return apiRequest<PaginatedResponse<TwilioConnection>>(
            `/phone/twilio/connections${buildPaginationQuery(params)}`,
        );
    },

    getConnection(id: string) {
        return apiRequest<TwilioConnection>(`/phone/twilio/connections/${id}`);
    },

    createConnection(data: {
        account_sid: string;
        auth_token: string;
        label?: string;
    }) {
        return apiRequest<TwilioConnection>("/phone/twilio/connections", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateConnection(id: string, data: { label?: string }) {
        return apiRequest<TwilioConnection>(`/phone/twilio/connections/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    deleteConnection(id: string) {
        return apiRequest<MessageResponse>(`/phone/twilio/connections/${id}`, {
            method: "DELETE",
        });
    },

    bulkDeleteConnections(ids: string[]) {
        return apiRequest<BulkDeleteResponse>(
            "/phone/twilio/connections/bulk-delete",
            {
                method: "POST",
                body: JSON.stringify({ ids }),
            },
        );
    },

    testUnsavedCredentials(account_sid: string, auth_token: string) {
        return apiRequest<TwilioTestResponse>(
            "/phone/twilio/connections/test",
            {
                method: "POST",
                body: JSON.stringify({ account_sid, auth_token }),
            },
        );
    },

    testConnection(id: string) {
        return apiRequest<TwilioTestResponse>(
            `/phone/twilio/connections/${id}/test`,
            {
                method: "POST",
            },
        );
    },

    listPhoneNumbers(
        params?: PaginationParams & { twilio_connection_id?: string },
    ) {
        const search = new URLSearchParams();
        if (params?.page) search.set("page", String(params.page));
        if (params?.page_size)
            search.set("page_size", String(params.page_size));
        if (params?.twilio_connection_id) {
            search.set("twilio_connection_id", params.twilio_connection_id);
        }
        const query = search.toString();
        return apiRequest<PaginatedResponse<PhoneNumber>>(
            `/phone/numbers${query ? `?${query}` : ""}`,
        );
    },

    importPhoneNumber(data: {
        twilio_connection_id: string;
        phone_number: string;
        label: string;
    }) {
        return apiRequest<PhoneNumber>("/phone/numbers", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    listAvailableNumbers(
        connectionId: string,
        params: {
            country?: string;
            area_code?: string;
            number_type?: NumberType;
            limit?: number;
        } = {},
    ) {
        const search = new URLSearchParams();
        if (params.country) search.set("country", params.country);
        if (params.area_code) search.set("area_code", params.area_code);
        if (params.number_type) search.set("number_type", params.number_type);
        if (params.limit) search.set("limit", String(params.limit));

        const query = search.toString();
        return apiRequest<TwilioAvailableNumber[]>(
            `/phone/twilio/connections/${connectionId}/available${query ? `?${query}` : ""}`,
        );
    },

    purchasePhoneNumber(data: {
        twilio_connection_id: string;
        phone_number: string;
        label: string;
    }) {
        return apiRequest<PhoneNumber>("/phone/numbers/purchase", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    deletePhoneNumber(id: string) {
        return apiRequest<MessageResponse>(`/phone/numbers/${id}`, {
            method: "DELETE",
        });
    },

    bulkDeletePhoneNumbers(ids: string[]) {
        return apiRequest<BulkDeleteResponse>("/phone/numbers/bulk-delete", {
            method: "POST",
            body: JSON.stringify({ ids }),
        });
    },

    registerWithElevenLabs(
        id: string,
        data: { elevenlabs_connection_id: string },
    ) {
        return apiRequest<PhoneNumber>(
            `/phone/numbers/${id}/register-elevenlabs`,
            {
                method: "POST",
                body: JSON.stringify(data),
            },
        );
    },
};
