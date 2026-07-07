"use client";

import { useAuth } from "@/lib/use-auth";

export default function ProfilePage() {
    const { user } = useAuth();

    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-zinc-500">Profile</p>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    My Account
                </h1>
            </div>
            <div className="max-w-md rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <dl className="space-y-3 text-sm">
                    <div>
                        <dt className="text-zinc-500">Email</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                            {user?.email}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-zinc-500">Member since</dt>
                        <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                            {user?.created_at
                                ? new Date(user.created_at).toLocaleDateString()
                                : "—"}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
