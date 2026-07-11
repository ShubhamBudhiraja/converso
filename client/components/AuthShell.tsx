import Link from "next/link";
import { ReactNode } from "react";

type AuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
};

export function AuthShell({
    title,
    subtitle,
    children,
    footer,
}: AuthShellProps) {
    return (
        <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-8 space-y-2 text-center">
                    <Link href="/" className="link-muted text-sm">
                        Converso
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {subtitle}
                    </p>
                </div>
                {children}
                {footer ? (
                    <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
