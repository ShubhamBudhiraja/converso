"use client";

import { create } from "zustand";

import { ApiError, CallerAgent, callerAgentApi, getApiErrorMessage } from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type CallerAgentStore = {
  agents: CallerAgent[];
  agentsLoading: boolean;
  agentsError: string | null;
  actionLoading: boolean;

  fetchAgents: () => Promise<void>;
  createAgent: (data: {
    name: string;
    twilio_connection_id: string;
    phone_number_id: string;
    elevenlabs_connection_id: string;
    elevenlabs_agent_id: string;
  }) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
};

export const useCallerAgentStore = create<CallerAgentStore>((set, get) => ({
  agents: [],
  agentsLoading: false,
  agentsError: null,
  actionLoading: false,

  async fetchAgents() {
    set({ agentsLoading: true, agentsError: null });
    try {
      const agents = await callerAgentApi.listAgents();
      set({ agents, agentsLoading: false });
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load caller agents");
      set({
        agentsError: message,
        agentsLoading: false,
      });
    }
  },

  async createAgent(data) {
    set({ actionLoading: true });
    try {
      await callerAgentApi.createAgent(data);
      await get().fetchAgents();
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteAgent(id) {
    set({ actionLoading: true });
    try {
      await callerAgentApi.deleteAgent(id);
      await get().fetchAgents();
    } catch (err) {
      set({ agentsError: getErrorMessage(err, "Failed to delete caller agent") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },
}));
