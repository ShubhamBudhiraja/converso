"use client";

import { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user.email} onLogout={logout} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-auto bg-white p-6 dark:bg-black">{children}</main>
      </div>
    </div>
  );
}
