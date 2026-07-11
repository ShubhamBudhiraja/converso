import { create } from "zustand";

import { ApiError, CallerAgent, DEFAULT_PAGE_SIZE, callerAgentApi, getApiErrorMessage } from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type CallerAgentStore = {
  agents: CallerAgent[];
  agentsLoading: boolean;
  agentsError: string | null;
  agentsPage: number;
  agentsTotal: number;
  agentsPageSize: number;
  actionLoading: boolean;

  fetchAgents: (page?: number) => Promise<void>;
  setAgentsPage: (page: number) => void;
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
  agentsPage: 1,
  agentsTotal: 0,
  agentsPageSize: DEFAULT_PAGE_SIZE,
  actionLoading: false,

  async fetchAgents(page) {
    const targetPage = page ?? get().agentsPage;
    set({ agentsLoading: true, agentsError: null });
    try {
      const data = await callerAgentApi.listAgents({
        page: targetPage,
        page_size: get().agentsPageSize,
      });
      const nextPage =
        data.total > 0 && data.items.length === 0 && targetPage > 1
          ? Math.max(1, Math.ceil(data.total / data.page_size))
          : targetPage;
      if (nextPage !== targetPage) {
        await get().fetchAgents(nextPage);
        return;
      }
      set({
        agents: data.items,
        agentsTotal: data.total,
        agentsPage: data.page,
        agentsLoading: false,
      });
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load caller agents");
      set({
        agentsError: message,
        agentsLoading: false,
      });
    }
  },

  setAgentsPage(page) {
    set({ agentsPage: page });
    void get().fetchAgents(page);
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
