"use client";

import { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="flex h-dvh items-center justify-center text-sm text-zinc-500">
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="relative flex h-dvh overflow-hidden">
            <AppHeader email={user.email} onLogout={logout} />
            <AppSidebar />
            <main className="h-dvh min-h-0 flex-1 overflow-y-auto bg-white p-6 pt-20 dark:bg-black">
                {children}
            </main>
        </div>
    );
}
