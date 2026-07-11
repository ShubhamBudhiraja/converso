import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/home", label: "Home" },
    { href: "/telephone-providers", label: "Telephone Providers" },
    { href: "/ai-providers", label: "AI Providers" },
    { href: "/agents", label: "Agents" },
    { href: "/contact-lists", label: "Contact lists" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/leads", label: "Leads" },
];

function isActive(pathname: string, href: string) {
    if (href === "/home") return pathname === "/home";
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="mt-14 flex h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            <nav className="flex flex-1 flex-col gap-1 p-3">
                {navItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`selectable-item rounded-lg px-3 py-2 text-sm font-medium ${
                                active
                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                            }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
