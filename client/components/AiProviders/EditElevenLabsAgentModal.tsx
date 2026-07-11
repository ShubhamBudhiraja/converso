import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
    ApiError,
    ElevenLabsAgent,
    ElevenLabsVoice,
    aiProviderApi,
} from "@/lib/api";

type EditElevenLabsAgentForm = {
    name: string;
    system_prompt: string;
    first_message: string;
    voice_id: string;
    llm: string;
};

type EditElevenLabsAgentModalProps = {
    connectionId: string;
    agent: ElevenLabsAgent | null;
    voices: ElevenLabsVoice[];
    voicesLoading: boolean;
    loading: boolean;
    onClose: () => void;
    onSubmit: (
        agentId: string,
        data: {
            name?: string;
            system_prompt?: string;
            first_message?: string;
            voice_id?: string;
            llm?: string;
        },
    ) => Promise<void>;
};

const LLM_OPTIONS = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

export function EditElevenLabsAgentModal({
    connectionId,
    agent,
    voices,
    voicesLoading,
    loading,
    onClose,
    onSubmit,
}: EditElevenLabsAgentModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditElevenLabsAgentForm>();
    const [formError, setFormError] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (!agent) return;

        setDetailLoading(true);
        setFormError(null);
        aiProviderApi
            .getAgent(connectionId, agent.agent_id)
            .then((detail) => {
                reset({
                    name: detail.name,
                    system_prompt:
                        detail.system_prompt || "You are a helpful assistant.",
                    first_message:
                        detail.first_message ||
                        "Hello! How can I help you today?",
                    voice_id: detail.voice_id || "",
                    llm: detail.llm || "gpt-4o-mini",
                });
            })
            .catch((err) => {
                setFormError(
                    err instanceof ApiError
                        ? err.message
                        : "Failed to load agent details",
                );
            })
            .finally(() => setDetailLoading(false));
    }, [agent, connectionId, reset]);

    async function submit(data: EditElevenLabsAgentForm) {
        if (!agent) return;
        setFormError(null);
        try {
            await onSubmit(agent.agent_id, {
                name: data.name.trim(),
                system_prompt: data.system_prompt.trim(),
                first_message: data.first_message.trim(),
                voice_id: data.voice_id,
                llm: data.llm,
            });
            onClose();
        } catch (err) {
            setFormError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to update agent",
            );
        }
    }

    return (
        <Modal open={!!agent} title="Edit ElevenLabs agent" onClose={onClose}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <Alert message={formError} />

                {detailLoading ? (
                    <p className="text-sm text-zinc-500">
                        Loading agent details...
                    </p>
                ) : (
                    <>
                        <Input
                            id="name"
                            label="Agent name"
                            error={errors.name?.message}
                            {...register("name", {
                                required: "Agent name is required",
                            })}
                        />

                        <Textarea
                            id="system_prompt"
                            label="System prompt"
                            error={errors.system_prompt?.message}
                            {...register("system_prompt", {
                                required: "System prompt is required",
                            })}
                        />

                        <Input
                            id="first_message"
                            label="First message"
                            error={errors.first_message?.message}
                            {...register("first_message", {
                                required: "First message is required",
                            })}
                        />

                        <Select
                            id="voice_id"
                            label="Voice"
                            error={errors.voice_id?.message}
                            disabled={voicesLoading}
                            {...register("voice_id", {
                                required: "Select a voice",
                            })}
                        >
                            <option value="">
                                {voicesLoading
                                    ? "Loading voices..."
                                    : "Select voice..."}
                            </option>
                            {voices.map((voice) => (
                                <option
                                    key={voice.voice_id}
                                    value={voice.voice_id}
                                >
                                    {voice.name} ({voice.language})
                                </option>
                            ))}
                        </Select>

                        <Select id="llm" label="LLM model" {...register("llm")}>
                            {LLM_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </>
                )}

                <FormActions
                    onCancel={onClose}
                    submitLabel="Save changes"
                    loading={loading || detailLoading}
                />
            </form>
        </Modal>
    );
}
