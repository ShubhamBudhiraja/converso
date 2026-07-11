import { create } from "zustand";

import {
  ApiError,
  DEFAULT_PAGE_SIZE,
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
  connectionsPage: number;
  connectionsTotal: number;
  connectionsPageSize: number;
  selectedConnectionIds: string[];
  actionLoading: boolean;

  currentConnection: ElevenLabsConnection | null;
  agents: ElevenLabsAgent[];
  agentsPage: number;
  agentsTotal: number;
  agentsPageSize: number;
  selectedAgentIds: string[];
  voices: ElevenLabsVoice[];
  detailLoading: boolean;
  detailError: string | null;
  testMessage: string | null;
  testLoading: boolean;

  fetchConnections: (page?: number) => Promise<void>;
  setConnectionsPage: (page: number) => void;
  createConnection: (data: { api_key: string; label?: string }) => Promise<void>;
  updateConnection: (id: string, data: { label?: string }) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  bulkDeleteConnections: (ids: string[]) => Promise<void>;

  fetchConnectionDetail: (connectionId: string) => Promise<void>;
  setAgentsPage: (page: number) => void;
  fetchAgents: (connectionId: string, page?: number) => Promise<void>;
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
  bulkDeleteElevenLabsAgents: (connectionId: string, agentIds: string[]) => Promise<void>;
  testConnection: (connectionId: string) => Promise<void>;
  toggleConnectionSelect: (id: string) => void;
  toggleAllConnections: () => void;
  clearConnectionSelection: () => void;
  toggleAgentSelect: (agentId: string) => void;
  toggleAllAgents: () => void;
  clearAgentSelection: () => void;
  resetDetail: () => void;
};

export const useAiProviderStore = create<AiProviderStore>((set, get) => ({
  connections: [],
  connectionsLoading: false,
  connectionsError: null,
  connectionsPage: 1,
  connectionsTotal: 0,
  connectionsPageSize: DEFAULT_PAGE_SIZE,
  selectedConnectionIds: [],
  actionLoading: false,

  currentConnection: null,
  agents: [],
  agentsPage: 1,
  agentsTotal: 0,
  agentsPageSize: DEFAULT_PAGE_SIZE,
  selectedAgentIds: [],
  voices: [],
  detailLoading: false,
  detailError: null,
  testMessage: null,
  testLoading: false,

  async fetchConnections(page) {
    const targetPage = page ?? get().connectionsPage;
    set({ connectionsLoading: true, connectionsError: null });
    try {
      const data = await aiProviderApi.listConnections({
        page: targetPage,
        page_size: get().connectionsPageSize,
      });
      const nextPage =
        data.total > 0 && data.items.length === 0 && targetPage > 1
          ? Math.max(1, Math.ceil(data.total / data.page_size))
          : targetPage;
      if (nextPage !== targetPage) {
        await get().fetchConnections(nextPage);
        return;
      }
      set({
        connections: data.items,
        connectionsTotal: data.total,
        connectionsPage: data.page,
        connectionsLoading: false,
      });
    } catch (err) {
      set({
        connectionsError: getErrorMessage(err, "Failed to load ElevenLabs accounts"),
        connectionsLoading: false,
      });
    }
  },

  setConnectionsPage(page) {
    set({ connectionsPage: page });
    void get().fetchConnections(page);
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
      agentsPage: 1,
      agentsTotal: 0,
      voices: [],
    });
    try {
      const [current, voices] = await Promise.all([
        aiProviderApi.getConnection(connectionId),
        aiProviderApi.listVoices(connectionId),
      ]);
      set({
        currentConnection: current,
        voices,
        detailLoading: false,
      });
      await get().fetchAgents(connectionId, 1);
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

  async fetchAgents(connectionId, page) {
    const targetPage = page ?? get().agentsPage;
    set({ detailLoading: true, detailError: null });
    try {
      const data = await aiProviderApi.listAgents(connectionId, {
        page: targetPage,
        page_size: get().agentsPageSize,
      });
      const nextPage =
        data.total > 0 && data.items.length === 0 && targetPage > 1
          ? Math.max(1, Math.ceil(data.total / data.page_size))
          : targetPage;
      if (nextPage !== targetPage) {
        await get().fetchAgents(connectionId, nextPage);
        return;
      }
      const currentConnection = get().currentConnection;
      set({
        agents: data.items,
        agentsTotal: data.total,
        agentsPage: data.page,
        detailLoading: false,
        ...(currentConnection
          ? {
              currentConnection: {
                ...currentConnection,
                agent_count: data.total,
              },
            }
          : {}),
      });
    } catch (err) {
      set({
        detailError: getErrorMessage(err, "Failed to load agents"),
        agents: [],
        detailLoading: false,
      });
    }
  },

  setAgentsPage(page) {
    const connectionId = get().currentConnection?.id;
    if (!connectionId) return;
    set({ agentsPage: page });
    void get().fetchAgents(connectionId, page);
  },

  async createElevenLabsAgent(connectionId, data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.createAgent(connectionId, data);
      await get().fetchAgents(connectionId, get().agentsPage);
    } finally {
      set({ actionLoading: false });
    }
  },

  async updateElevenLabsAgent(connectionId, agentId, data) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.updateAgent(connectionId, agentId, data);
      await get().fetchAgents(connectionId, get().agentsPage);
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteElevenLabsAgent(connectionId, agentId) {
    set({ actionLoading: true });
    try {
      await aiProviderApi.deleteAgent(connectionId, agentId);
      await get().fetchAgents(connectionId, get().agentsPage);
    } catch (err) {
      set({ detailError: getErrorMessage(err, "Failed to delete agent") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async bulkDeleteElevenLabsAgents(connectionId, agentIds) {
    set({ actionLoading: true });
    try {
      for (const agentId of agentIds) {
        await aiProviderApi.deleteAgent(connectionId, agentId);
      }
      set({ selectedAgentIds: [] });
      await get().fetchAgents(connectionId, get().agentsPage);
    } catch (err) {
      set({ detailError: getErrorMessage(err, "Failed to delete agents") });
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
    const pageIds = connections.map((item) => item.id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedConnectionIds.includes(id));
    if (allPageSelected) {
      set({
        selectedConnectionIds: selectedConnectionIds.filter((id) => !pageIds.includes(id)),
      });
      return;
    }
    set({
      selectedConnectionIds: [...new Set([...selectedConnectionIds, ...pageIds])],
    });
  },

  clearConnectionSelection() {
    set({ selectedConnectionIds: [] });
  },

  toggleAgentSelect(agentId) {
    set((state) => ({
      selectedAgentIds: state.selectedAgentIds.includes(agentId)
        ? state.selectedAgentIds.filter((item) => item !== agentId)
        : [...state.selectedAgentIds, agentId],
    }));
  },

  toggleAllAgents() {
    const { agents, selectedAgentIds } = get();
    const pageIds = agents.map((item) => item.agent_id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedAgentIds.includes(id));
    if (allPageSelected) {
      set({
        selectedAgentIds: selectedAgentIds.filter((id) => !pageIds.includes(id)),
      });
      return;
    }
    set({
      selectedAgentIds: [...new Set([...selectedAgentIds, ...pageIds])],
    });
  },

  clearAgentSelection() {
    set({ selectedAgentIds: [] });
  },

  resetDetail() {
    set({
      currentConnection: null,
      agents: [],
      agentsPage: 1,
      agentsTotal: 0,
      selectedAgentIds: [],
      voices: [],
      detailLoading: false,
      detailError: null,
      testMessage: null,
      testLoading: false,
    });
  },
}));
