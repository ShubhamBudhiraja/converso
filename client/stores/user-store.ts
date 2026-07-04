"use client";

import { create } from "zustand";

import { ApiError, UserResponse, authApi } from "@/lib/api";

type UserStore = {
  user: UserResponse | null;
  loading: boolean;
  initialized: boolean;
  fetchUser: () => Promise<UserResponse | null>;
  logout: () => Promise<void>;
  reset: () => void;
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  async fetchUser() {
    set({ loading: true });
    try {
      const currentUser = await authApi.me();
      set({ user: currentUser, loading: false, initialized: true });
      return currentUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          await authApi.refresh();
          const currentUser = await authApi.me();
          set({ user: currentUser, loading: false, initialized: true });
          return currentUser;
        } catch {
          set({ user: null, loading: false, initialized: true });
          return null;
        }
      }
      set({ user: null, loading: false, initialized: true });
      return null;
    }
  },

  async logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    get().reset();
  },

  reset() {
    set({ user: null, loading: false, initialized: true });
  },
}));
