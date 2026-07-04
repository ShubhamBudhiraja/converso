"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AccountDetailsCard } from "@/components/TelephoneProviders/AccountDetailsCard";
import { ImportNumberModal } from "@/components/TelephoneProviders/ImportNumberModal";
import { PhoneNumbersTable } from "@/components/TelephoneProviders/PhoneNumbersTable";
import { PurchaseNumberModal } from "@/components/TelephoneProviders/PurchaseNumberModal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { BulkActionsBar } from "@/components/ui/PageHeader";
import { PhoneNumber } from "@/lib/api";
import { usePhoneStore } from "@/stores/phone-store";

export default function TelephoneProviderNumbersPage() {
    const params = useParams<{ connectionId: string }>();
    const connectionId = params.connectionId;

    const {
        currentConnection,
        phoneNumbers,
        detailLoading,
        detailError,
        selectedPhoneNumberIds,
        actionLoading,
        testLoading,
        testMessage,
        availableNumbers,
        searchLoading,
        fetchConnectionDetail,
        testConnection,
        importPhoneNumber,
        purchasePhoneNumber,
        deletePhoneNumber,
        bulkDeletePhoneNumbers,
        searchAvailableNumbers,
        togglePhoneNumberSelect,
        toggleAllPhoneNumbers,
        clearPhoneNumberSelection,
        clearAvailableNumbers,
        resetDetail,
    } = usePhoneStore();

    const [importOpen, setImportOpen] = useState(false);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PhoneNumber | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    useEffect(() => {
        fetchConnectionDetail(connectionId);
        return () => resetDetail();
    }, [connectionId, fetchConnectionDetail, resetDetail]);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Link href="/telephone-providers" className="link-muted">
                    ← Back to Twilio accounts
                </Link>
                <p className="text-sm text-zinc-500">Telephone Providers</p>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {currentConnection?.label ||
                        currentConnection?.account_sid_masked ||
                        "Twilio account"}
                </h1>
            </div>

            {currentConnection ? (
                <AccountDetailsCard
                    connection={currentConnection}
                    testLoading={testLoading}
                    testMessage={testMessage}
                    onTestAgain={() => testConnection(connectionId)}
                />
            ) : null}

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Phone numbers
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Numbers saved in Converso for this Twilio account.
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button
                        variant="secondary"
                        disabled={!currentConnection}
                        onClick={() => setImportOpen(true)}
                    >
                        Import number
                    </Button>
                    <Button
                        disabled={!currentConnection}
                        onClick={() => {
                            clearAvailableNumbers();
                            setPurchaseOpen(true);
                        }}
                    >
                        Purchase number
                    </Button>
                </div>
            </div>

            <Alert message={detailError} />

            <BulkActionsBar
                count={selectedPhoneNumberIds.length}
                onDelete={() => setBulkDeleteOpen(true)}
            />

            <PhoneNumbersTable
                phoneNumbers={phoneNumbers}
                loading={detailLoading}
                selectedIds={selectedPhoneNumberIds}
                onToggleSelect={togglePhoneNumberSelect}
                onToggleSelectAll={toggleAllPhoneNumbers}
                onDelete={setDeleteTarget}
            />

            <ImportNumberModal
                open={importOpen}
                loading={actionLoading}
                onClose={() => setImportOpen(false)}
                onSubmit={(data) =>
                    importPhoneNumber({
                        twilio_connection_id: connectionId,
                        ...data,
                    })
                }
            />

            <PurchaseNumberModal
                open={purchaseOpen}
                loading={actionLoading}
                searchLoading={searchLoading}
                availableNumbers={availableNumbers}
                onClose={() => setPurchaseOpen(false)}
                onSearch={(data) => searchAvailableNumbers(connectionId, data)}
                onPurchase={(data) =>
                    purchasePhoneNumber({
                        twilio_connection_id: connectionId,
                        ...data,
                    })
                }
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete phone number?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteTarget?.phone_number}</strong> from
                        Converso? This does not release the number from your
                        Twilio account.
                    </>
                }
                confirmLabel="Delete number"
                loading={actionLoading}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await deletePhoneNumber(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={bulkDeleteOpen}
                title="Delete selected phone numbers?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        {selectedPhoneNumberIds.length} phone number
                        {selectedPhoneNumberIds.length === 1 ? "" : "s"} from
                        Converso? This does not release them from your Twilio
                        account.
                    </>
                }
                confirmLabel="Delete numbers"
                loading={actionLoading}
                onConfirm={async () => {
                    await bulkDeletePhoneNumbers(selectedPhoneNumberIds);
                    setBulkDeleteOpen(false);
                    clearPhoneNumberSelection();
                }}
                onCancel={() => setBulkDeleteOpen(false)}
            />
        </div>
    );
}
