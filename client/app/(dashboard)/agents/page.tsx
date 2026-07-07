"use client";

import { useEffect, useState } from "react";

import { CallerAgentsTable } from "@/components/Agents/CallerAgentsTable";
import { CreateCallerAgentModal } from "@/components/Agents/CreateCallerAgentModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CallerAgent } from "@/lib/api";
import { useCallerAgentStore } from "@/stores/agent-store";

export default function AgentsPage() {
    const {
        agents,
        agentsLoading,
        agentsError,
        actionLoading,
        fetchAgents,
        createAgent,
        deleteAgent,
    } = useCallerAgentStore();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CallerAgent | null>(null);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Agents"
                title="Caller Agents"
                description="Wire a telephone number to an ElevenLabs conversational agent. Caller agents are used when running outbound campaigns."
                action={
                    <Button onClick={() => setCreateOpen(true)}>
                        Create caller agent
                    </Button>
                }
            />

            <Alert message={agentsError} />

            <CallerAgentsTable
                agents={agents}
                loading={agentsLoading}
                onDelete={setDeleteTarget}
            />

            <CreateCallerAgentModal
                open={createOpen}
                loading={actionLoading}
                onClose={() => setCreateOpen(false)}
                onSubmit={createAgent}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete caller agent?"
                description={
                    <>
                        Are you sure you want to delete{" "}
                        <strong>{deleteTarget?.name}</strong>? This unassigns
                        the ElevenLabs agent from the phone number.
                    </>
                }
                confirmLabel="Delete caller agent"
                loading={actionLoading}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await deleteAgent(deleteTarget.id);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
