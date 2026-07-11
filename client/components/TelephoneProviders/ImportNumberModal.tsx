import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";

type ImportNumberForm = {
    phone_number: string;
    label: string;
};

type ImportNumberModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (data: ImportNumberForm) => Promise<void>;
};

export function ImportNumberModal({
    open,
    loading,
    onClose,
    onSubmit,
}: ImportNumberModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ImportNumberForm>({
        defaultValues: { phone_number: "", label: "" },
    });
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            reset({ phone_number: "", label: "" });
            setFormError(null);
        }
    }, [open, reset]);

    async function submit(data: ImportNumberForm) {
        setFormError(null);
        try {
            await onSubmit({
                phone_number: data.phone_number.trim(),
                label: data.label.trim(),
            });
            onClose();
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to import phone number",
            );
        }
    }

    return (
        <Modal open={open} title="Import phone number" onClose={onClose}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <Alert message={formError} />
                <Input
                    id="phone_number"
                    label="Phone number (E.164)"
                    placeholder="+14155551234"
                    error={errors.phone_number?.message}
                    {...register("phone_number", {
                        required: "Phone number is required",
                    })}
                />
                <Input
                    id="number_label"
                    label="Label"
                    error={errors.label?.message}
                    {...register("label", { required: "Label is required" })}
                />
                <p className="text-xs text-zinc-500">
                    The number must already exist in this Twilio account.
                </p>
                <FormActions
                    onCancel={onClose}
                    submitLabel="Import number"
                    loading={loading}
                />
            </form>
        </Modal>
    );
}
