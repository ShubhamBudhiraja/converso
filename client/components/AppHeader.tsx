"use client";

import Link from "next/link";

import { UserDropdown } from "@/components/ui/UserDropdown";
import Image from "next/image";

type AppHeaderProps = {
    email?: string;
    onLogout: () => void;
};

export function AppHeader({ email, onLogout }: AppHeaderProps) {
    return (
        <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
            <Link
                href="/home"
                className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
                <Image
                    src="/images/logoo.png"
                    alt="Converso"
                    width={170}
                    height={40}
                />
            </Link>
            <UserDropdown email={email} onLogout={onLogout} />
        </header>
    );
}
