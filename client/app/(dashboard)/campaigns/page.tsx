"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CampaignsTable } from "@/components/Campaigns/CampaignsTable";
import { CreateCampaignModal } from "@/components/Campaigns/CreateCampaignModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Campaign } from "@/lib/api";
import { useCampaignStore } from "@/stores/campaign-store";

export default function CampaignsPage() {
    const router = useRouter();
    const {
        contactLists,
        campaigns,
        campaignsLoading,
        campaignsError,
        campaignsPage,
        campaignsTotal,
        campaignsPageSize,
        actionLoading,
        fetchContactLists,
        fetchCampaigns,
        createCampaign,
        cancelCampaign,
        startCampaign,
        deleteCampaign,
        setCampaignsPage,
    } = useCampaignStore();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteCampaignTarget, setDeleteCampaignTarget] =
        useState<Campaign | null>(null);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    useEffect(() => {
        if (createOpen) {
            fetchContactLists();
        }
    }, [createOpen, fetchContactLists]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Campaigns"
                title="Outbound campaigns"
                description="Create and manage outbound calling campaigns using your caller agents and contact lists."
                action={
                    <Button onClick={() => setCreateOpen(true)}>
                        Create campaign
                    </Button>
                }
            />

            <Alert message={campaignsError} />

            <CampaignsTable
                campaigns={campaigns}
                loading={campaignsLoading}
                actionLoading={actionLoading}
                onDelete={setDeleteCampaignTarget}
                onCancel={(campaign) => void cancelCampaign(campaign.id)}
                onStart={(campaign) => void startCampaign(campaign.id)}
                page={campaignsPage}
                pageSize={campaignsPageSize}
                total={campaignsTotal}
                onPageChange={setCampaignsPage}
            />

            <CreateCampaignModal
                open={createOpen}
                loading={actionLoading}
                contactLists={contactLists}
                onClose={() => setCreateOpen(false)}
                onSubmit={async (data) => {
                    const campaign = await createCampaign(data);
                    router.push(`/campaigns/${campaign.id}`);
                }}
            />

            <ConfirmDialog
                open={!!deleteCampaignTarget}
                title="Delete campaign?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteCampaignTarget?.name}</strong>?
                    </>
                }
                confirmLabel="Delete campaign"
                loading={actionLoading}
                onConfirm={async () => {
                    if (!deleteCampaignTarget) return;
                    await deleteCampaign(deleteCampaignTarget.id);
                    setDeleteCampaignTarget(null);
                }}
                onCancel={() => setDeleteCampaignTarget(null)}
            />
        </div>
    );
}
