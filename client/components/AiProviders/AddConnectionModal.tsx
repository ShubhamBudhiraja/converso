import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";

type AddConnectionForm = {
    api_key: string;
    label: string;
};

type AddConnectionModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: { api_key: string; label?: string }) => Promise<void>;
};

export function AddConnectionModal({
    open,
    loading,
    onClose,
    onSubmit,
}: AddConnectionModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddConnectionForm>({
        defaultValues: { api_key: "", label: "" },
    });
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            reset({ api_key: "", label: "" });
            setFormError(null);
        }
    }, [open, reset]);

    async function submit(data: AddConnectionForm) {
        setFormError(null);
        try {
            await onSubmit({
                api_key: data.api_key.trim(),
                label: data.label.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to add ElevenLabs account",
            );
        }
    }

    return (
        <Modal open={open} title="Add ElevenLabs account" onClose={onClose}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <Alert message={formError} />
                <Input
                    id="api_key"
                    label="API key"
                    type="password"
                    error={errors.api_key?.message}
                    {...register("api_key", {
                        required: "API key is required",
                    })}
                />
                <Input
                    id="label"
                    label="Label (optional)"
                    {...register("label")}
                />
                <p className="text-xs text-zinc-500">
                    Your API key is validated against ElevenLabs before being
                    saved. To change the key later, delete this account and add
                    it again.
                </p>
                <FormActions
                    onCancel={onClose}
                    submitLabel="Add account"
                    loading={loading}
                />
            </form>
        </Modal>
    );
}
