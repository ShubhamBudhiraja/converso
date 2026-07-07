"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ApiError, ElevenLabsConnection } from "@/lib/api";

type RegisterElevenLabsModalProps = {
  open: boolean;
  loading: boolean;
  connections: ElevenLabsConnection[];
  connectionsLoading: boolean;
  onClose: () => void;
  onSubmit: (elevenlabsConnectionId: string) => Promise<void>;
};

export function RegisterElevenLabsModal({
  open,
  loading,
  connections,
  connectionsLoading,
  onClose,
  onSubmit,
}: RegisterElevenLabsModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId(connections[0]?.id ?? "");
      setFormError(null);
    }
  }, [open, connections]);

  async function handleSubmit() {
    if (!selectedId) {
      setFormError("Select an ElevenLabs account");
      return;
    }
    setFormError(null);
    try {
      await onSubmit(selectedId);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to register with ElevenLabs",
      );
    }
  }

  return (
    <Modal open={open} title="Register with ElevenLabs" onClose={onClose}>
      <div className="space-y-4">
        <Alert message={formError} />
        {connectionsLoading ? (
          <p className="text-sm text-zinc-500">Loading ElevenLabs accounts...</p>
        ) : connections.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No ElevenLabs accounts connected. Add one under AI Providers first.
          </p>
        ) : (
          <Select
            id="elevenlabs_connection"
            label="ElevenLabs account"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.label || connection.api_key_masked}
              </option>
            ))}
          </Select>
        )}
        <p className="text-xs text-zinc-500">
          This imports the Twilio number into ElevenLabs using your saved Twilio credentials so it
          can be used with conversational AI agents.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || connections.length === 0}
            onClick={handleSubmit}
          >
            {loading ? "Registering..." : "Register number"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
