import Link from "next/link";
import { ReactNode } from "react";

type DashboardSectionProps = {
    title: string;
    description?: string;
    href?: string;
    linkLabel?: string;
    className?: string;
    actions?: ReactNode;
    children: ReactNode;
};

export function DashboardSection({
    title,
    description,
    href,
    linkLabel = "View all",
    className = "",
    actions,
    children,
}: DashboardSectionProps) {
    return (
        <section
            className={`overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${className}`.trim()}
        >
            <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        {title}
                    </h2>
                    {description ? (
                        <p className="mt-1 text-sm text-zinc-500">{description}</p>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {actions}
                    {href ? (
                        <Link href={href} className="link-muted shrink-0 text-sm">
                            {linkLabel}
                        </Link>
                    ) : null}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}
