"use client";

import { useEffect, useState } from "react";

import { ContactListsTable } from "@/components/Campaigns/ContactListsTable";
import { EditContactListModal } from "@/components/Campaigns/EditContactListModal";
import { ImportContactListModal } from "@/components/Campaigns/ImportContactListModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactList } from "@/lib/api";
import { useCampaignStore } from "@/stores/campaign-store";

export default function ContactListsPage() {
    const {
        contactLists,
        contactListsLoading,
        contactListsError,
        contactListsPage,
        contactListsTotal,
        contactListsPageSize,
        actionLoading,
        fetchContactLists,
        importContactList,
        deleteContactList,
        updateContactList,
        downloadContactListCsv,
        setContactListsPage,
    } = useCampaignStore();

    const [importOpen, setImportOpen] = useState(false);
    const [editListTarget, setEditListTarget] = useState<ContactList | null>(
        null,
    );
    const [deleteListTarget, setDeleteListTarget] =
        useState<ContactList | null>(null);

    useEffect(() => {
        fetchContactLists();
    }, [fetchContactLists]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Contact lists"
                title="Contact lists"
                description="Import CSV contact lists to use as audiences in outbound campaigns."
                action={
                    <Button onClick={() => setImportOpen(true)}>
                        Import CSV
                    </Button>
                }
            />

            <Alert message={contactListsError} />

            <ContactListsTable
                lists={contactLists}
                loading={contactListsLoading}
                onEdit={setEditListTarget}
                onDownload={(list) => void downloadContactListCsv(list)}
                onDelete={setDeleteListTarget}
                page={contactListsPage}
                pageSize={contactListsPageSize}
                total={contactListsTotal}
                onPageChange={setContactListsPage}
            />

            <ImportContactListModal
                open={importOpen}
                loading={actionLoading}
                onClose={() => setImportOpen(false)}
                onSubmit={importContactList}
            />

            <EditContactListModal
                list={editListTarget}
                loading={actionLoading}
                onClose={() => setEditListTarget(null)}
                onSubmit={updateContactList}
            />

            <ConfirmDialog
                open={!!deleteListTarget}
                title="Delete contact list?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteListTarget?.name}</strong>? This removes
                        all imported contacts.
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
        </div>
    );
}
