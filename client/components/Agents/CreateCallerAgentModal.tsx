"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Modal } from "@/components/Modal";
import { Alert } from "@/components/ui/Alert";
import { FormActions } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ApiError,
  ElevenLabsAgent,
  ElevenLabsConnection,
  PhoneNumber,
  TwilioConnection,
  aiProviderApi,
  phoneApi,
} from "@/lib/api";

type CreateCallerAgentForm = {
  name: string;
  twilio_connection_id: string;
  phone_number_id: string;
  elevenlabs_connection_id: string;
  elevenlabs_agent_id: string;
};

type CreateCallerAgentModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    twilio_connection_id: string;
    phone_number_id: string;
    elevenlabs_connection_id: string;
    elevenlabs_agent_id: string;
  }) => Promise<void>;
};

export function CreateCallerAgentModal({
  open,
  loading,
  onClose,
  onSubmit,
}: CreateCallerAgentModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateCallerAgentForm>({
    defaultValues: {
      name: "",
      twilio_connection_id: "",
      phone_number_id: "",
      elevenlabs_connection_id: "",
      elevenlabs_agent_id: "",
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [twilioConnections, setTwilioConnections] = useState<TwilioConnection[]>([]);
  const [elevenLabsConnections, setElevenLabsConnections] = useState<ElevenLabsConnection[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [elevenLabsAgents, setElevenLabsAgents] = useState<ElevenLabsAgent[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [phonesLoading, setPhonesLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const selectedTwilioId = watch("twilio_connection_id");
  const selectedElevenLabsId = watch("elevenlabs_connection_id");

  useEffect(() => {
    if (!open) return;
    reset({
      name: "",
      twilio_connection_id: "",
      phone_number_id: "",
      elevenlabs_connection_id: "",
      elevenlabs_agent_id: "",
    });
    setFormError(null);
    setPhoneNumbers([]);
    setElevenLabsAgents([]);
    setProvidersLoading(true);
    Promise.all([
      phoneApi.listConnections({ page: 1, page_size: 100 }),
      aiProviderApi.listConnections({ page: 1, page_size: 100 }),
    ])
      .then(([twilio, elevenlabs]) => {
        setTwilioConnections(twilio.items);
        setElevenLabsConnections(elevenlabs.items);
      })
      .finally(() => setProvidersLoading(false));
  }, [open, reset]);

  useEffect(() => {
    if (!selectedTwilioId) {
      setPhoneNumbers([]);
      return;
    }
    setPhonesLoading(true);
    phoneApi
      .listPhoneNumbers({
        twilio_connection_id: selectedTwilioId,
        page: 1,
        page_size: 100,
      })
      .then((data) => setPhoneNumbers(data.items))
      .finally(() => setPhonesLoading(false));
  }, [selectedTwilioId]);

  useEffect(() => {
    if (!selectedElevenLabsId) {
      setElevenLabsAgents([]);
      return;
    }
    setAgentsLoading(true);
    aiProviderApi
      .listAgents(selectedElevenLabsId, { page: 1, page_size: 100 })
      .then((data) => setElevenLabsAgents(data.items))
      .finally(() => setAgentsLoading(false));
  }, [selectedElevenLabsId]);

  async function submit(data: CreateCallerAgentForm) {
    setFormError(null);
    try {
      await onSubmit({
        name: data.name.trim(),
        twilio_connection_id: data.twilio_connection_id,
        phone_number_id: data.phone_number_id,
        elevenlabs_connection_id: data.elevenlabs_connection_id,
        elevenlabs_agent_id: data.elevenlabs_agent_id,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create caller agent");
    }
  }

  return (
    <Modal open={open} title="Create caller agent" onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Alert message={formError} />

        <Input
          id="name"
          label="Caller agent name"
          error={errors.name?.message}
          {...register("name", { required: "Name is required" })}
        />

        <Select
          id="twilio_connection_id"
          label="Telephone provider"
          error={errors.twilio_connection_id?.message}
          disabled={providersLoading}
          {...register("twilio_connection_id", { required: "Select a telephone provider" })}
        >
          <option value="">
            {providersLoading ? "Loading providers..." : "Select telephone provider..."}
          </option>
          {twilioConnections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.label || connection.account_sid_masked}
            </option>
          ))}
        </Select>

        <Select
          id="phone_number_id"
          label="Phone number"
          error={errors.phone_number_id?.message}
          disabled={!selectedTwilioId || phonesLoading}
          {...register("phone_number_id", { required: "Select a phone number" })}
        >
          <option value="">
            {phonesLoading
              ? "Loading phone numbers..."
              : selectedTwilioId
                ? "Select phone number..."
                : "Select a telephone provider first"}
          </option>
          {phoneNumbers.map((number) => (
            <option key={number.id} value={number.id}>
              {number.phone_number}
              {number.label ? ` (${number.label})` : ""}
            </option>
          ))}
        </Select>

        <Select
          id="elevenlabs_connection_id"
          label="AI provider (ElevenLabs)"
          error={errors.elevenlabs_connection_id?.message}
          disabled={providersLoading}
          {...register("elevenlabs_connection_id", { required: "Select an AI provider" })}
        >
          <option value="">
            {providersLoading ? "Loading providers..." : "Select ElevenLabs account..."}
          </option>
          {elevenLabsConnections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.label || connection.api_key_masked}
            </option>
          ))}
        </Select>

        <Select
          id="elevenlabs_agent_id"
          label="ElevenLabs agent"
          error={errors.elevenlabs_agent_id?.message}
          disabled={!selectedElevenLabsId || agentsLoading}
          {...register("elevenlabs_agent_id", { required: "Select an ElevenLabs agent" })}
        >
          <option value="">
            {agentsLoading
              ? "Loading agents..."
              : selectedElevenLabsId
                ? "Select agent..."
                : "Select an AI provider first"}
          </option>
          {elevenLabsAgents.map((agent) => (
            <option key={agent.agent_id} value={agent.agent_id}>
              {agent.name}
            </option>
          ))}
        </Select>

        <p className="text-xs text-zinc-500">
          Registers the phone with ElevenLabs if needed, assigns the selected agent, and saves a
          caller agent you can use in campaigns.
        </p>

        <FormActions onCancel={onClose} submitLabel="Create caller agent" loading={loading} />
      </form>
    </Modal>
  );
}
