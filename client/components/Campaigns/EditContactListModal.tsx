import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { ApiError, ContactList } from "@/lib/api";

type EditContactListForm = {
    name: string;
};

type EditContactListModalProps = {
    list: ContactList | null;
    loading: boolean;
    onClose: () => void;
    onSubmit: (id: string, data: { name: string }) => Promise<void>;
};

export function EditContactListModal({
    list,
    loading,
    onClose,
    onSubmit,
}: EditContactListModalProps) {
    const { register, handleSubmit, reset } = useForm<EditContactListForm>({
        defaultValues: { name: "" },
    });
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (list) {
            reset({ name: list.name });
            setFormError(null);
        }
    }, [list, reset]);

    async function submit(data: EditContactListForm) {
        if (!list) return;
        const name = data.name.trim();
        if (!name) {
            setFormError("List name is required");
            return;
        }

        setFormError(null);
        try {
            await onSubmit(list.id, { name });
            onClose();
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to update contact list",
            );
        }
    }

    return (
        <Modal open={!!list} title="Edit contact list" onClose={onClose}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <Alert message={formError} />
                <Input
                    id="edit_contact_list_name"
                    label="List name"
                    {...register("name", { required: true })}
                />
                <FormActions
                    onCancel={onClose}
                    submitLabel="Save"
                    loading={loading}
                />
            </form>
        </Modal>
    );
}
