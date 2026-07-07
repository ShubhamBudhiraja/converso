"use client";

import { create } from "zustand";

import {
  ApiError,
  ElevenLabsAgent,
  ElevenLabsConnection,
  ElevenLabsVoice,
  aiProviderApi,
  getApiErrorMessage,
} from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type AiProviderStore = {
  connections: ElevenLabsConnection[];
  connectionsLoading: boolean;
  connectionsError: string | null;
  selectedConnectionIds: string[];
  actionLoading: boolean;

  currentConnection: ElevenLabsConnection | null;
  agents: ElevenLabsAgent[];
  voices: ElevenLabsVoice[];
  detailLoading: boolean;
  detailError: string | null;
  testMessage: string | null;
  testLoading: boolean;

  fetchConnections: () => Promise<void>;
  createConnection: (data: { api_key: string; label?: string }) => Promise<void>;
  updateConnection: (id: string, data: { label?: string }) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  bulkDeleteConnections: (ids: string[]) => Promise<void>;

  fetchConnectionDetail: (connectionId: string) => Promise<void>;
  createElevenLabsAgent: (
    connectionId: string,
    data: {
      name: string;
      system_prompt?: string;
      first_message?: string;
      voice_id: string;
      llm?: string;
    },
  ) => Promise<void>;
  updateElevenLabsAgent: (
    connectionId: string,
    agentId: string,
    data: {
      name?: string;
      system_prompt?: string;
      first_message?: string;
      voice_id?: string;
      llm?: string;
    },
  ) => Promise<void>;
  deleteElevenLabsAgent: (connectionId: string, agentId: string) => Promise<void>;
  testConnection: (connectionId: string) => Promise<void>;
  toggleConnectionSelect: (id: string) => void;
  toggleAllConnections: () => void;
  clearConnectionSelection: () => void;
  resetDetail: () => void;
};

export const useAiProviderStore = create<AiProviderStore>((set, get) => ({
  connections: [],
  connectionsLoading: false,
  connectionsError: null,
  selectedConnectionIds: [],
  actionLoading: false,

  currentConnection: null,
  agents: [],
  voices: [],
  detailLoading: false,
  detailError: null,
  testMessage: null,
  testLoading: false,

  async fetchConnections() {
    set({ connectionsLoading: true, connectionsError: null });
    try {
      const data = await aiProviderApi.listConnections();
      set((state) => ({
        connections: data,
        connectionsLoading: false,
        selectedConnectionIds: state.selectedConnectionIds.filter((id) =>
          data.some((item) => item.id === id),
        ),
      }));
    } catch (err) {
      set({
        connectionsError: getErrorMessage(err, "Failed to load ElevenLabs accounts"),
        connectionsLoading: false,
      });
    }
  },

  async createConnection(data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.createConnection(data);
      await get().fetchConnections();
    } finally {
      set({ actionLoading: false });
    }
  },

  async updateConnection(id, data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.updateConnection(id, data);
      await get().fetchConnections();
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteConnection(id) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.deleteConnection(id);
      await get().fetchConnections();
    } catch (err) {
      set({ connectionsError: getErrorMessage(err, "Failed to delete account") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async bulkDeleteConnections(ids) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.bulkDeleteConnections(ids);
      set({ selectedConnectionIds: [] });
      await get().fetchConnections();
    } catch (err) {
      set({ connectionsError: getErrorMessage(err, "Failed to delete accounts") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async fetchConnectionDetail(connectionId) {
    set({
      detailLoading: true,
      detailError: null,
      currentConnection: null,
      agents: [],
      voices: [],
    });
    try {
      const [current, agents, voices] = await Promise.all([
        aiProviderApi.getConnection(connectionId),
        aiProviderApi.listAgents(connectionId),
        aiProviderApi.listVoices(connectionId),
      ]);
      set({
        currentConnection: current,
        agents,
        voices,
        detailLoading: false,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        set({
          detailError: "ElevenLabs account not found",
          currentConnection: null,
          agents: [],
          voices: [],
          detailLoading: false,
        });
        return;
      }
      set({
        detailError: getErrorMessage(err, "Failed to load ElevenLabs account"),
        currentConnection: null,
        agents: [],
        voices: [],
        detailLoading: false,
      });
    }
  },

  async createElevenLabsAgent(connectionId, data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.createAgent(connectionId, data);
      await get().fetchConnectionDetail(connectionId);
    } finally {
      set({ actionLoading: false });
    }
  },

  async updateElevenLabsAgent(connectionId, agentId, data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.updateAgent(connectionId, agentId, data);
      await get().fetchConnectionDetail(connectionId);
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteElevenLabsAgent(connectionId, agentId) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.deleteAgent(connectionId, agentId);
      await get().fetchConnectionDetail(connectionId);
    } catch (err) {
      set({ detailError: getErrorMessage(err, "Failed to delete agent") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async testConnection(connectionId) {
    set({ testLoading: true, testMessage: null });
    try {
      const result = await aiProviderApi.testConnection(connectionId);
      const details = [
        result.message,
        result.subscription_tier ? `Plan: ${result.subscription_tier}` : null,
        result.character_count != null && result.character_limit != null
          ? `Characters: ${result.character_count.toLocaleString()} / ${result.character_limit.toLocaleString()}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      set({ testMessage: details });
      await get().fetchConnectionDetail(connectionId);
    } catch (err) {
      set({ testMessage: getErrorMessage(err, "Failed to test connection") });
    } finally {
      set({ testLoading: false });
    }
  },

  toggleConnectionSelect(id) {
    set((state) => ({
      selectedConnectionIds: state.selectedConnectionIds.includes(id)
        ? state.selectedConnectionIds.filter((item) => item !== id)
        : [...state.selectedConnectionIds, id],
    }));
  },

  toggleAllConnections() {
    const { connections, selectedConnectionIds } = get();
    if (selectedConnectionIds.length === connections.length) {
      set({ selectedConnectionIds: [] });
      return;
    }
    set({ selectedConnectionIds: connections.map((item) => item.id) });
  },

  clearConnectionSelection() {
    set({ selectedConnectionIds: [] });
  },

  resetDetail() {
    set({
      currentConnection: null,
      agents: [],
      voices: [],
      detailLoading: false,
      detailError: null,
      testMessage: null,
      testLoading: false,
    });
  },
}));
