"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { CampaignCallsTable } from "@/components/Campaigns/CampaignCallsTable";
import { CampaignStatusBadge } from "@/components/Campaigns/CampaignStatusBadge";
import { EditCampaignModal } from "@/components/Campaigns/EditCampaignModal";
import { PencilIcon } from "@/components/Icons";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { canEditCampaign } from "@/lib/campaigns";
import { useCampaignStore } from "@/stores/campaign-store";

export default function CampaignDetailPage() {
    const params = useParams<{ campaignId: string }>();
    const campaignId = params.campaignId;

    const {
        currentCampaign,
        campaignCalls,
        contactLists,
        detailError,
        callsPage,
        callsTotal,
        callsPageSize,
        actionLoading,
        fetchCampaignDetail,
        fetchContactLists,
        startCampaign,
        cancelCampaign,
        updateCampaign,
        setCallsPage,
        resetDetail,
    } = useCampaignStore();

    const [editOpen, setEditOpen] = useState(false);

    useEffect(() => {
        fetchCampaignDetail(campaignId);
        const interval = setInterval(() => {
            fetchCampaignDetail(campaignId, { silent: true });
        }, 10000);
        return () => {
            clearInterval(interval);
            resetDetail();
        };
    }, [campaignId, fetchCampaignDetail, resetDetail]);

    useEffect(() => {
        if (editOpen) {
            fetchContactLists();
        }
    }, [editOpen, fetchContactLists]);

    const isInitialLoading =
        !detailError &&
        (currentCampaign === null || currentCampaign.id !== campaignId);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Link href="/campaigns" className="link-muted mb-2 block">
                    ← Back to campaigns
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                                {isInitialLoading ? (
                                    <Skeleton className="h-8 w-64 max-w-full" />
                                ) : (
                                    currentCampaign?.name
                                )}
                            </h1>
                            {!isInitialLoading &&
                                currentCampaign &&
                                canEditCampaign(currentCampaign) && (
                                    <Button
                                        variant="icon"
                                        title="Edit campaign"
                                        aria-label="Edit campaign"
                                        disabled={actionLoading}
                                        onClick={() => setEditOpen(true)}
                                    >
                                        <PencilIcon />
                                    </Button>
                                )}
                        </div>
                        {!isInitialLoading && currentCampaign && (
                            <div className="mt-2 flex items-center gap-2">
                                <CampaignStatusBadge
                                    status={currentCampaign.status}
                                />
                                <span className="text-sm text-zinc-500">
                                    Scheduled{" "}
                                    {formatDate(currentCampaign.scheduled_at)}
                                </span>
                            </div>
                        )}
                    </div>
                    {!isInitialLoading && currentCampaign && (
                        <div className="flex gap-2">
                            {currentCampaign.status === "scheduled" && (
                                <Button
                                    disabled={actionLoading}
                                    onClick={() => startCampaign(campaignId)}
                                >
                                    Start now
                                </Button>
                            )}
                            {(currentCampaign.status === "scheduled" ||
                                currentCampaign.status === "running") && (
                                <Button
                                    variant="secondary"
                                    disabled={actionLoading}
                                    onClick={() => cancelCampaign(campaignId)}
                                >
                                    Cancel campaign
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Alert message={detailError} />

            {!isInitialLoading && currentCampaign && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Contacts"
                        value={currentCampaign.total_contacts}
                    />
                    <StatCard
                        label="Calls initiated"
                        value={currentCampaign.calls_initiated}
                    />
                    <StatCard
                        label="Completed"
                        value={currentCampaign.calls_completed}
                    />
                    <StatCard
                        label="Failed"
                        value={currentCampaign.calls_failed}
                    />
                </div>
            )}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Calls
                </h2>
                <CampaignCallsTable
                    calls={campaignCalls}
                    loading={isInitialLoading}
                    page={callsPage}
                    pageSize={callsPageSize}
                    total={callsTotal}
                    onPageChange={setCallsPage}
                />
            </section>

            <EditCampaignModal
                open={editOpen}
                loading={actionLoading}
                campaign={currentCampaign}
                contactLists={contactLists}
                onClose={() => setEditOpen(false)}
                onSubmit={async (data) => {
                    await updateCampaign(campaignId, data);
                }}
            />
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
