import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
    ApiError,
    CallerAgent,
    Campaign,
    ContactList,
    callerAgentApi,
} from "@/lib/api";
import { toDatetimeLocalValue } from "@/lib/campaigns";

type EditCampaignForm = {
    name: string;
    caller_agent_id: string;
    scheduled_at: string;
    timezone: string;
    retry_attempts: number;
    retry_interval: "24h" | "48h" | "72h";
};

type EditCampaignModalProps = {
    open: boolean;
    loading: boolean;
    campaign: Campaign | null;
    contactLists: ContactList[];
    onClose: () => void;
    onSubmit: (data: {
        name: string;
        caller_agent_id: string;
        list_ids: string[];
        scheduled_at: string;
        schedule_settings: {
            timezone: string;
            retry_attempts: number;
            retry_interval: "24h" | "48h" | "72h";
        };
    }) => Promise<void>;
};

export function EditCampaignModal({
    open,
    loading,
    campaign,
    contactLists,
    onClose,
    onSubmit,
}: EditCampaignModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditCampaignForm>();
    const [formError, setFormError] = useState<string | null>(null);
    const [callerAgents, setCallerAgents] = useState<CallerAgent[]>([]);
    const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
    const [providersLoading, setProvidersLoading] = useState(false);

    const completedLists = contactLists.filter(
        (list) => list.status === "completed" && list.total_contacts > 0,
    );

    useEffect(() => {
        if (!open || !campaign) return;

        reset({
            name: campaign.name,
            caller_agent_id: campaign.caller_agent_id,
            scheduled_at: toDatetimeLocalValue(campaign.scheduled_at),
            timezone: campaign.timezone,
            retry_attempts: campaign.retry_attempts,
            retry_interval: campaign.retry_interval,
        });
        setSelectedListIds(campaign.list_ids);
        setFormError(null);
        setProvidersLoading(true);
        callerAgentApi
            .listAgents({ page: 1, page_size: 100 })
            .then((data) => setCallerAgents(data.items))
            .catch(() => setCallerAgents([]))
            .finally(() => setProvidersLoading(false));
    }, [open, campaign, reset]);

    function toggleList(id: string) {
        setSelectedListIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    }

    return (
        <Modal open={open} title="Edit campaign" onClose={onClose}>
            <form
                className="space-y-4"
                onSubmit={handleSubmit(async (values) => {
                    setFormError(null);
                    if (selectedListIds.length === 0) {
                        setFormError("Select at least one contact list");
                        return;
                    }
                    try {
                        const scheduledAt = new Date(
                            values.scheduled_at,
                        ).toISOString();
                        await onSubmit({
                            name: values.name,
                            caller_agent_id: values.caller_agent_id,
                            list_ids: selectedListIds,
                            scheduled_at: scheduledAt,
                            schedule_settings: {
                                timezone: values.timezone,
                                retry_attempts: Number(values.retry_attempts),
                                retry_interval: values.retry_interval,
                            },
                        });
                        onClose();
                    } catch (err) {
                        setFormError(
                            err instanceof ApiError
                                ? err.message
                                : "Failed to update campaign",
                        );
                    }
                })}
            >
                <Alert message={formError} />

                <Input
                    label="Campaign name"
                    error={errors.name?.message}
                    {...register("name", {
                        required: "Campaign name is required",
                    })}
                />

                <Select
                    label="Caller agent"
                    disabled={providersLoading}
                    error={errors.caller_agent_id?.message}
                    {...register("caller_agent_id", {
                        required: "Caller agent is required",
                    })}
                >
                    <option value="">Select caller agent</option>
                    {callerAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.phone_number})
                        </option>
                    ))}
                </Select>

                <div>
                    <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Contact lists
                    </p>
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        {completedLists.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                                Import a completed contact list first.
                            </p>
                        ) : (
                            completedLists.map((list) => (
                                <label
                                    key={list.id}
                                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={selectedListIds.includes(
                                            list.id,
                                        )}
                                        onChange={() => toggleList(list.id)}
                                    />
                                    <span>
                                        {list.name} ({list.total_contacts}{" "}
                                        contacts)
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <Input
                    label="Scheduled start"
                    type="datetime-local"
                    error={errors.scheduled_at?.message}
                    {...register("scheduled_at", {
                        required: "Schedule is required",
                    })}
                />

                <Input
                    label="Timezone"
                    error={errors.timezone?.message}
                    {...register("timezone", {
                        required: "Timezone is required",
                    })}
                />

                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="Retry attempts"
                        type="number"
                        min={1}
                        max={10}
                        {...register("retry_attempts", {
                            valueAsNumber: true,
                            min: 1,
                            max: 10,
                        })}
                    />
                    <Select
                        label="Retry interval"
                        {...register("retry_interval")}
                    >
                        <option value="24h">24 hours</option>
                        <option value="48h">48 hours</option>
                        <option value="72h">72 hours</option>
                    </Select>
                </div>

                <FormActions
                    onCancel={onClose}
                    submitLabel={loading ? "Saving..." : "Save changes"}
                    loading={loading}
                />
            </form>
        </Modal>
    );
}
