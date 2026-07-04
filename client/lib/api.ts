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

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item: { msg?: string }) => item.msg).join(", ");
    }
  } catch {
    // fall through
  }
  return "Something went wrong. Please try again.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  return response.json() as Promise<T>;
}

export type MessageResponse = {
  message: string;
};

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

export type NumberType = "local" | "toll_free" | "mobile";

export const phoneApi = {
  listConnections() {
    return apiRequest<TwilioConnection[]>("/phone/twilio/connections");
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
    return apiRequest<BulkDeleteResponse>("/phone/twilio/connections/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  testUnsavedCredentials(account_sid: string, auth_token: string) {
    return apiRequest<TwilioTestResponse>("/phone/twilio/connections/test", {
      method: "POST",
      body: JSON.stringify({ account_sid, auth_token }),
    });
  },

  testConnection(id: string) {
    return apiRequest<TwilioTestResponse>(`/phone/twilio/connections/${id}/test`, {
      method: "POST",
    });
  },

  listPhoneNumbers() {
    return apiRequest<PhoneNumber[]>("/phone/numbers");
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
};
