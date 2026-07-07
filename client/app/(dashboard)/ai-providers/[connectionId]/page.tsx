"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AccountDetailsCard } from "@/components/AiProviders/AccountDetailsCard";
import { AccountDetailsCardSkeleton } from "@/components/AiProviders/AccountDetailsCardSkeleton";
import { AgentsTable } from "@/components/AiProviders/AgentsTable";
import { CreateElevenLabsAgentModal } from "@/components/AiProviders/CreateElevenLabsAgentModal";
import { EditElevenLabsAgentModal } from "@/components/AiProviders/EditElevenLabsAgentModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ElevenLabsAgent } from "@/lib/api";
import { useAiProviderStore } from "@/stores/ai-provider-store";

export default function AiProviderDetailPage() {
  const params = useParams<{ connectionId: string }>();
  const connectionId = params.connectionId;

  const {
    currentConnection,
    agents,
    voices,
    detailLoading,
    detailError,
    testLoading,
    testMessage,
    actionLoading,
    fetchConnectionDetail,
    createElevenLabsAgent,
    updateElevenLabsAgent,
    deleteElevenLabsAgent,
    testConnection,
    resetDetail,
  } = useAiProviderStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ElevenLabsAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ElevenLabsAgent | null>(null);

  useEffect(() => {
    fetchConnectionDetail(connectionId);
    return () => resetDetail();
  }, [connectionId, fetchConnectionDetail, resetDetail]);

  const isLoading =
    detailLoading ||
    (!detailError &&
      (currentConnection === null || currentConnection.id !== connectionId));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/ai-providers" className="link-muted mb-2 block">
          ← Back to AI Providers
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {isLoading ? (
            <Skeleton className="h-8 w-64 max-w-full" />
          ) : (
            currentConnection?.label ||
            currentConnection?.api_key_masked ||
            "ElevenLabs account"
          )}
        </h1>
      </div>

      {isLoading ? (
        <AccountDetailsCardSkeleton />
      ) : currentConnection ? (
        <AccountDetailsCard
          connection={currentConnection}
          testLoading={testLoading}
          testMessage={testMessage}
          onTestAgain={() => testConnection(connectionId)}
        />
      ) : null}

      <Alert message={detailError} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Conversational agents
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            All agents on this ElevenLabs account. Create agents here, then use them when building
            caller agents for campaigns.
          </p>
        </div>
        <Button disabled={isLoading} onClick={() => setCreateOpen(true)}>
          Create agent
        </Button>
      </div>

      <AgentsTable
        agents={agents}
        loading={isLoading}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />

      <CreateElevenLabsAgentModal
        open={createOpen}
        loading={actionLoading}
        voices={voices}
        voicesLoading={isLoading}
        onClose={() => setCreateOpen(false)}
        onSubmit={(data) => createElevenLabsAgent(connectionId, data)}
      />

      <EditElevenLabsAgentModal
        connectionId={connectionId}
        agent={editTarget}
        voices={voices}
        voicesLoading={isLoading}
        loading={actionLoading}
        onClose={() => setEditTarget(null)}
        onSubmit={(agentId, data) => updateElevenLabsAgent(connectionId, agentId, data)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ElevenLabs agent?"
        description={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong> from ElevenLabs?
            Caller agents using this agent may stop working.
          </>
        }
        confirmLabel="Delete agent"
        loading={actionLoading}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteElevenLabsAgent(connectionId, deleteTarget.agent_id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
