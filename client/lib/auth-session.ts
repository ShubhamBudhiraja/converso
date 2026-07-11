export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please log in again.";

export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

let refreshPromise: Promise<boolean> | null = null;

function shouldAttemptRefresh(path: string): boolean {
  return (
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/signup") &&
    !path.startsWith("/auth/refresh") &&
    !path.startsWith("/auth/forgot-password") &&
    !path.startsWith("/auth/reset-password")
  );
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function handleSessionExpired(message = SESSION_EXPIRED_MESSAGE): never {
  import("@/stores/user-store").then(({ useUserStore }) => {
    useUserStore.getState().reset();
  });

  if (typeof window !== "undefined") {
    sessionStorage.setItem("auth_error", message);
    window.location.replace("/login");
  }

  throw new SessionExpiredError();
}

export function shouldRefreshOn401(path: string): boolean {
  return shouldAttemptRefresh(path);
}
