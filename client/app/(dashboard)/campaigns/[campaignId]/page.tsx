"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";

import { CampaignCallsTable } from "@/components/Campaigns/CampaignCallsTable";
import { CampaignStatusBadge } from "@/components/Campaigns/CampaignStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { useCampaignStore } from "@/stores/campaign-store";

export default function CampaignDetailPage() {
    const params = useParams<{ campaignId: string }>();
    const campaignId = params.campaignId;

    const {
        currentCampaign,
        campaignCalls,
        detailLoading,
        detailError,
        callsPage,
        callsTotal,
        callsPageSize,
        actionLoading,
        fetchCampaignDetail,
        startCampaign,
        cancelCampaign,
        setCallsPage,
        resetDetail,
    } = useCampaignStore();

    useEffect(() => {
        fetchCampaignDetail(campaignId);
        const interval = setInterval(() => {
            void fetchCampaignDetail(campaignId);
        }, 10000);
        return () => {
            clearInterval(interval);
            resetDetail();
        };
    }, [campaignId, fetchCampaignDetail, resetDetail]);

    const isLoading =
        detailLoading ||
        (!detailError &&
            (currentCampaign === null || currentCampaign.id !== campaignId));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Link href="/campaigns" className="link-muted mb-2 block">
                    ← Back to campaigns
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                            {isLoading ? (
                                <Skeleton className="h-8 w-64 max-w-full" />
                            ) : (
                                currentCampaign?.name
                            )}
                        </h1>
                        {!isLoading && currentCampaign && (
                            <div className="mt-2 flex items-center gap-2">
                                <CampaignStatusBadge status={currentCampaign.status} />
                                <span className="text-sm text-zinc-500">
                                    Scheduled {formatDate(currentCampaign.scheduled_at)}
                                </span>
                            </div>
                        )}
                    </div>
                    {!isLoading && currentCampaign && (
                        <div className="flex gap-2">
                            {(currentCampaign.status === "scheduled" ||
                                currentCampaign.status === "running") && (
                                <Button
                                    disabled={actionLoading}
                                    onClick={() => void startCampaign(campaignId)}
                                >
                                    {currentCampaign.status === "running"
                                        ? "Resume dialing"
                                        : "Start now"}
                                </Button>
                            )}
                            {(currentCampaign.status === "scheduled" ||
                                currentCampaign.status === "running") && (
                                <Button
                                    variant="secondary"
                                    disabled={actionLoading}
                                    onClick={() => void cancelCampaign(campaignId)}
                                >
                                    Cancel campaign
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Alert message={detailError} />

            {!isLoading && currentCampaign && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Contacts" value={currentCampaign.total_contacts} />
                    <StatCard
                        label="Calls initiated"
                        value={currentCampaign.calls_initiated}
                    />
                    <StatCard
                        label="Completed"
                        value={currentCampaign.calls_completed}
                    />
                    <StatCard label="Failed" value={currentCampaign.calls_failed} />
                </div>
            )}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Calls
                </h2>
                <CampaignCallsTable
                    calls={campaignCalls}
                    loading={isLoading}
                    page={callsPage}
                    pageSize={callsPageSize}
                    total={callsTotal}
                    onPageChange={setCallsPage}
                />
            </section>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {value}
            </p>
        </div>
    );
}
