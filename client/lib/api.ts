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
