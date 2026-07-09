"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CampaignsTable } from "@/components/Campaigns/CampaignsTable";
import { ContactListsTable } from "@/components/Campaigns/ContactListsTable";
import { CreateCampaignModal } from "@/components/Campaigns/CreateCampaignModal";
import { ImportContactListModal } from "@/components/Campaigns/ImportContactListModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Campaign, ContactList } from "@/lib/api";
import { useCampaignStore } from "@/stores/campaign-store";

export default function CampaignsPage() {
    const router = useRouter();
    const {
        contactLists,
        contactListsLoading,
        contactListsError,
        contactListsPage,
        contactListsTotal,
        contactListsPageSize,
        campaigns,
        campaignsLoading,
        campaignsError,
        campaignsPage,
        campaignsTotal,
        campaignsPageSize,
        actionLoading,
        fetchContactLists,
        fetchCampaigns,
        importContactList,
        deleteContactList,
        createCampaign,
        cancelCampaign,
        startCampaign,
        deleteCampaign,
        setContactListsPage,
        setCampaignsPage,
    } = useCampaignStore();

    const [importOpen, setImportOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteListTarget, setDeleteListTarget] = useState<ContactList | null>(null);
    const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<Campaign | null>(null);

    useEffect(() => {
        fetchContactLists();
        fetchCampaigns();
    }, [fetchContactLists, fetchCampaigns]);

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Campaigns"
                title="Outbound campaigns"
                description="Import contact lists, create campaigns, and initiate outbound calls through your caller agents."
                action={
                    <Button onClick={() => setCreateOpen(true)}>
                        Create campaign
                    </Button>
                }
            />

            <Alert message={campaignsError || contactListsError} />

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Campaigns
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Scheduled and active outbound calling jobs.
                        </p>
                    </div>
                </div>

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
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            Contact lists
                        </h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            CSV imports used as campaign audiences.
                        </p>
                    </div>
                    <Button variant="secondary" onClick={() => setImportOpen(true)}>
                        Import CSV
                    </Button>
                </div>

                <ContactListsTable
                    lists={contactLists}
                    loading={contactListsLoading}
                    onDelete={setDeleteListTarget}
                    page={contactListsPage}
                    pageSize={contactListsPageSize}
                    total={contactListsTotal}
                    onPageChange={setContactListsPage}
                />
            </section>

            <ImportContactListModal
                open={importOpen}
                loading={actionLoading}
                onClose={() => setImportOpen(false)}
                onSubmit={importContactList}
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
                open={!!deleteListTarget}
                title="Delete contact list?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteListTarget?.name}</strong>? This removes all
                        imported contacts.
                    </>
                }
                confirmLabel="Delete contact list"
                loading={actionLoading}
                onConfirm={async () => {
                    if (!deleteListTarget) return;
                    await deleteContactList(deleteListTarget.id);
                    setDeleteListTarget(null);
                }}
                onCancel={() => setDeleteListTarget(null)}
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
