"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CampaignStatusBadge } from "@/components/Campaigns/CampaignStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { Campaign } from "@/lib/api";

import { DashboardSection } from "./DashboardSection";

type DashboardCampaignsTableProps = {
    campaigns: Campaign[];
    loading: boolean;
};

export function DashboardCampaignsTable({
    campaigns,
    loading,
}: DashboardCampaignsTableProps) {
    const router = useRouter();

    return (
        <DashboardSection
            title="Recent campaigns"
            description="Latest outbound calling jobs"
            href="/campaigns"
        >
            {loading ? (
                <TableSkeleton />
            ) : campaigns.length === 0 ? (
                <EmptyState
                    message="No campaigns yet."
                    href="/campaigns"
                    linkLabel="Create your first campaign"
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                                <th className="pb-3 pr-4 font-medium">Name</th>
                                <th className="pb-3 pr-4 font-medium">Status</th>
                                <th className="pb-3 pr-4 font-medium">Progress</th>
                                <th className="pb-3 font-medium">Scheduled</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {campaigns.map((campaign) => (
                                <tr
                                    key={campaign.id}
                                    className="selectable-row cursor-pointer"
                                    onClick={() =>
                                        router.push(`/campaigns/${campaign.id}`)
                                    }
                                >
                                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                                        {campaign.name}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <CampaignStatusBadge status={campaign.status} />
                                    </td>
                                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">
                                        {campaign.calls_completed}/{campaign.total_contacts} completed
                                    </td>
                                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                                        {formatDate(campaign.scheduled_at)}
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
