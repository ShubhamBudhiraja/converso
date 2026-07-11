import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";

type AddConnectionForm = {
    account_sid: string;
    auth_token: string;
    label: string;
};

type AddConnectionModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: {
        account_sid: string;
        auth_token: string;
        label?: string;
    }) => Promise<void>;
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
        defaultValues: { account_sid: "", auth_token: "", label: "" },
    });
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            reset({ account_sid: "", auth_token: "", label: "" });
            setFormError(null);
        }
    }, [open, reset]);

    async function submit(data: AddConnectionForm) {
        setFormError(null);
        try {
            await onSubmit({
                account_sid: data.account_sid.trim(),
                auth_token: data.auth_token.trim(),
                label: data.label.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to add Twilio account",
            );
        }
    }

    return (
        <Modal open={open} title="Add Twilio account" onClose={onClose}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <Alert message={formError} />
                <Input
                    id="account_sid"
                    label="Account SID"
                    error={errors.account_sid?.message}
                    {...register("account_sid", {
                        required: "Account SID is required",
                    })}
                />
                <Input
                    id="auth_token"
                    label="Auth Token"
                    type="password"
                    error={errors.auth_token?.message}
                    {...register("auth_token", {
                        required: "Auth token is required",
                    })}
                />
                <Input
                    id="label"
                    label="Label (optional)"
                    {...register("label")}
                />
                <p className="text-xs text-zinc-500">
                    To change Account SID or Auth Token later, delete this
                    account and add it again.
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
