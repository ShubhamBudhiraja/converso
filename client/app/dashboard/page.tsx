"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, authApi } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await authApi.me();
        setEmail(user.email);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            await authApi.refresh();
            const user = await authApi.me();
            setEmail(user.email);
            return;
          } catch {
            router.replace("/login");
            return;
          }
        }
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // cookies cleared server-side when possible
    }
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-sm text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm text-zinc-500">Dashboard</p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          You&apos;re logged in
        </h1>
        {email ? (
          <p className="text-zinc-600 dark:text-zinc-400">Signed in as {email}</p>
        ) : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleLogout}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Log out this device
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
