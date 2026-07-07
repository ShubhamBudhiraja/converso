"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ElevenLabsVoice } from "@/lib/api";
import { ApiError } from "@/lib/api";

type CreateElevenLabsAgentForm = {
  name: string;
  system_prompt: string;
  first_message: string;
  voice_id: string;
  llm: string;
};

type CreateElevenLabsAgentModalProps = {
  open: boolean;
  loading: boolean;
  voices: ElevenLabsVoice[];
  voicesLoading: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    system_prompt?: string;
    first_message?: string;
    voice_id: string;
    llm?: string;
  }) => Promise<void>;
};

const LLM_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
];

export function CreateElevenLabsAgentModal({
  open,
  loading,
  voices,
  voicesLoading,
  onClose,
  onSubmit,
}: CreateElevenLabsAgentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateElevenLabsAgentForm>({
    defaultValues: {
      name: "",
      system_prompt: "You are a helpful assistant.",
      first_message: "Hello! How can I help you today?",
      voice_id: "",
      llm: "gpt-4o-mini",
    },
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    reset({
      name: "",
      system_prompt: "You are a helpful assistant.",
      first_message: "Hello! How can I help you today?",
      voice_id: "",
      llm: "gpt-4o-mini",
    });
    setFormError(null);
  }, [open, reset]);

  async function submit(data: CreateElevenLabsAgentForm) {
    setFormError(null);
    try {
      await onSubmit({
        name: data.name.trim(),
        system_prompt: data.system_prompt.trim(),
        first_message: data.first_message.trim(),
        voice_id: data.voice_id,
        llm: data.llm,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create agent");
    }
  }

  return (
    <Modal open={open} title="Create ElevenLabs agent" onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Alert message={formError} />

        <Input
          id="name"
          label="Agent name"
          error={errors.name?.message}
          {...register("name", { required: "Agent name is required" })}
        />

        <Textarea
          id="system_prompt"
          label="System prompt"
          error={errors.system_prompt?.message}
          {...register("system_prompt", { required: "System prompt is required" })}
        />

        <Input
          id="first_message"
          label="First message"
          error={errors.first_message?.message}
          {...register("first_message", { required: "First message is required" })}
        />

        <Select
          id="voice_id"
          label="Voice"
          error={errors.voice_id?.message}
          disabled={voicesLoading}
          {...register("voice_id", { required: "Select a voice" })}
        >
          <option value="">{voicesLoading ? "Loading voices..." : "Select voice..."}</option>
          {voices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
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

        <p className="text-xs text-zinc-500">
          Creates a conversational AI agent on your ElevenLabs account. Use caller agents on the
          Agents page to wire a phone number to this agent for campaigns.
        </p>

        <FormActions onCancel={onClose} submitLabel="Create agent" loading={loading} />
      </form>
    </Modal>
  );
}
