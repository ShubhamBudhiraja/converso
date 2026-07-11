"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useUserStore } from "@/stores/user-store";

export default function Home() {
    const router = useRouter();
    const { user, loading, initialized, fetchUser } = useUserStore();

    useEffect(() => {
        if (!initialized) {
            void fetchUser();
        }
    }, [initialized, fetchUser]);

    useEffect(() => {
        if (!initialized || loading) return;
        router.replace(user ? "/home" : "/login");
    }, [initialized, loading, user, router]);

    return (
        <div className="flex min-h-dvh items-center justify-center">
            <div
                className="size-40 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
                role="status"
                aria-label="Loading"
            />
        </div>
    );
}
