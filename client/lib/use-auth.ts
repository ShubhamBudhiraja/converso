"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useUserStore } from "@/stores/user-store";

export function useAuth() {
  const router = useRouter();
  const { user, loading, initialized, fetchUser, logout } = useUserStore();

  const loadUser = useCallback(async () => {
    const currentUser = await fetchUser();
    if (!currentUser) {
      router.replace("/login");
    }
    return currentUser;
  }, [fetchUser, router]);

  useEffect(() => {
    if (!initialized) {
      loadUser();
    }
  }, [initialized, loadUser]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return { user, loading: loading || !initialized, logout: handleLogout, refreshUser: loadUser };
}
