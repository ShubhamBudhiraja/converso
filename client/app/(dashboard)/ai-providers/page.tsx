"use client";

import { useEffect, useState } from "react";

import { AddConnectionModal } from "@/components/AiProviders/AddConnectionModal";
import { ConnectionsTable } from "@/components/AiProviders/ConnectionsTable";
import { EditConnectionModal } from "@/components/AiProviders/EditConnectionModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ElevenLabsConnection } from "@/lib/api";
import { useAiProviderStore } from "@/stores/ai-provider-store";

export default function AiProvidersPage() {
    const {
        connections,
        connectionsLoading,
        connectionsError,
        connectionsPage,
        connectionsTotal,
        connectionsPageSize,
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
        setConnectionsPage,
    } = useAiProviderStore();

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ElevenLabsConnection | null>(
        null,
    );
    const [deleteTarget, setDeleteTarget] =
        useState<ElevenLabsConnection | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="AI Providers"
                title="ElevenLabs Accounts"
                description="Connect ElevenLabs API keys to manage conversational AI agents and voice integrations."
                action={
                    <Button onClick={() => setAddOpen(true)}>
                        Add ElevenLabs account
                    </Button>
                }
            />

            <Alert message={connectionsError} />

            <ConnectionsTable
                connections={connections}
                loading={connectionsLoading}
                selectedIds={selectedConnectionIds}
                onToggleSelect={toggleConnectionSelect}
                onToggleSelectAll={toggleAllConnections}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                page={connectionsPage}
                pageSize={connectionsPageSize}
                total={connectionsTotal}
                onPageChange={setConnectionsPage}
                onDeleteSelected={() => setBulkDeleteOpen(true)}
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
                title="Delete ElevenLabs account?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>
                            {deleteTarget?.label ||
                                deleteTarget?.api_key_masked}
                        </strong>
                        ? Linked phone registrations in Converso will be
                        cleared.
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
                title="Delete selected ElevenLabs accounts?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        {selectedConnectionIds.length} account
                        {selectedConnectionIds.length === 1 ? "" : "s"}? Linked
                        phone registrations will be cleared in Converso.
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
