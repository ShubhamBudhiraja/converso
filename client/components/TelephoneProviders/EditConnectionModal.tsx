"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { ApiError, TwilioConnection } from "@/lib/api";

type EditConnectionForm = {
  label: string;
};

type EditConnectionModalProps = {
  connection: TwilioConnection | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: { label?: string }) => Promise<void>;
};

export function EditConnectionModal({
  connection,
  loading,
  onClose,
  onSubmit,
}: EditConnectionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<EditConnectionForm>({ defaultValues: { label: "" } });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (connection) {
      reset({ label: connection.label ?? "" });
      setFormError(null);
    }
  }, [connection, reset]);

  async function submit(data: EditConnectionForm) {
    if (!connection) return;
    setFormError(null);
    try {
      await onSubmit(connection.id, { label: data.label.trim() || undefined });
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to update label");
    }
  }

  return (
    <Modal open={!!connection} title="Edit account label" onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Alert message={formError} />
        <Input id="edit_label" label="Label" {...register("label")} />
        <FormActions onCancel={onClose} submitLabel="Save" loading={loading} />
      </form>
    </Modal>
  );
}
