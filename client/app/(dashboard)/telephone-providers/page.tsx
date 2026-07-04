"use client";

import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddConnectionModal } from "@/components/TelephoneProviders/AddConnectionModal";
import { ConnectionsTable } from "@/components/TelephoneProviders/ConnectionsTable";
import { EditConnectionModal } from "@/components/TelephoneProviders/EditConnectionModal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { BulkActionsBar, PageHeader } from "@/components/ui/PageHeader";
import { TwilioConnection } from "@/lib/api";
import { usePhoneStore } from "@/stores/phone-store";

export default function TelephoneProvidersPage() {
    const {
        connections,
        connectionsLoading,
        connectionsError,
        selectedConnectionIds,
        actionLoading,
        fetchConnections,
        createConnection,
        updateConnection,
        deleteConnection,
        bulkDeleteConnections,
        toggleConnectionSelect,
        toggleAllConnections,
        clearConnectionSelection,
    } = usePhoneStore();

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<TwilioConnection | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TwilioConnection | null>(
        null,
    );
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Telephone Providers"
                title="Twilio accounts"
                description="Connect Twilio accounts and manage phone numbers for each account."
                action={
                    <Button onClick={() => setAddOpen(true)}>
                        Add Twilio account
                    </Button>
                }
            />

            <Alert message={connectionsError} />

            <BulkActionsBar
                count={selectedConnectionIds.length}
                onDelete={() => setBulkDeleteOpen(true)}
            />

            <ConnectionsTable
                connections={connections}
                loading={connectionsLoading}
                selectedIds={selectedConnectionIds}
                onToggleSelect={toggleConnectionSelect}
                onToggleSelectAll={toggleAllConnections}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
            />

            <AddConnectionModal
                open={addOpen}
                loading={actionLoading}
                onClose={() => setAddOpen(false)}
                onSubmit={createConnection}
            />

            <EditConnectionModal
                connection={editTarget}
                loading={actionLoading}
                onClose={() => setEditTarget(null)}
                onSubmit={updateConnection}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Twilio account?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>
                            {deleteTarget?.label ||
                                deleteTarget?.account_sid_masked}
                        </strong>
                        ? All phone numbers associated with this account will
                        also be deleted from Converso.
                    </>
                }
                confirmLabel="Delete account"
                loading={actionLoading}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await deleteConnection(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                title="Delete selected Twilio accounts?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        {selectedConnectionIds.length} account
                        {selectedConnectionIds.length === 1 ? "" : "s"}? All
                        phone numbers associated with these accounts will also
                        be deleted from Converso.
                    </>
                }
                confirmLabel="Delete accounts"
                loading={actionLoading}
                onConfirm={async () => {
                    await bulkDeleteConnections(selectedConnectionIds);
                    setBulkDeleteOpen(false);
                    clearConnectionSelection();
                }}
                onCancel={() => setBulkDeleteOpen(false)}
            />
        </div>
    );
}
