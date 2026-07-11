import Link from "next/link";

import { LeadStatusBadge } from "@/components/Leads/LeadStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { Lead } from "@/lib/api";

import { DashboardSection } from "./DashboardSection";

type DashboardLeadsTableProps = {
    leads: Lead[];
    loading: boolean;
};

export function DashboardLeadsTable({ leads, loading }: DashboardLeadsTableProps) {
    return (
        <DashboardSection
            title="This month's leads"
            description="Recent leads from outbound campaign calls"
            href="/leads"
        >
            {loading ? (
                <TableSkeleton />
            ) : leads.length === 0 ? (
                <EmptyState
                    message="No leads this month yet."
                    href="/campaigns"
                    linkLabel="Create a campaign"
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                                <th className="pb-3 pr-4 font-medium">Contact</th>
                                <th className="pb-3 pr-4 font-medium">Status</th>
                                <th className="pb-3 pr-4 font-medium">Campaign</th>
                                <th className="pb-3 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {leads.map((lead) => (
                                <tr key={lead.id}>
                                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                                        {lead.contact_name || lead.phone_number || "—"}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <LeadStatusBadge status={lead.status} />
                                    </td>
                                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                                        {lead.campaign_name || "—"}
                                    </td>
                                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                                        {formatDate(lead.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </DashboardSection>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
            ))}
        </div>
    );
}

function EmptyState({
    message,
    href,
    linkLabel,
}: {
    message: string;
    href: string;
    linkLabel: string;
}) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500">{message}</p>
            <Link href={href} className="link-muted mt-3 inline-block text-sm">
                {linkLabel}
            </Link>
        </div>
    );
}
