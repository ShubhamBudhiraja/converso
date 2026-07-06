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
        <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200/40 bg-white/40 px-6 backdrop-blur-lg backdrop-saturate-150 dark:border-zinc-800/40 dark:bg-zinc-950/40">
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
