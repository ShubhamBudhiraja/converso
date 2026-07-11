import { create } from "zustand";

import {
  DEFAULT_PAGE_SIZE,
  Lead,
  LeadStatistics,
  LeadStatus,
  getApiErrorMessage,
  leadsApi,
} from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type LeadStore = {
  leads: Lead[];
  leadsLoading: boolean;
  leadsError: string | null;
  leadsPage: number;
  leadsTotal: number;
  leadsPageSize: number;
  statusFilter: LeadStatus | "";
  statistics: LeadStatistics | null;
  statisticsLoading: boolean;

  fetchLeads: (page?: number) => Promise<void>;
  fetchStatistics: () => Promise<void>;
  setLeadsPage: (page: number) => void;
  setStatusFilter: (status: LeadStatus | "") => void;
};

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  leadsLoading: false,
  leadsError: null,
  leadsPage: 1,
  leadsTotal: 0,
  leadsPageSize: DEFAULT_PAGE_SIZE,
  statusFilter: "",
  statistics: null,
  statisticsLoading: false,

  async fetchLeads(page) {
    const targetPage = page ?? get().leadsPage;
    set({ leadsLoading: true, leadsError: null });
    try {
      const data = await leadsApi.listLeads({
        page: targetPage,
        page_size: get().leadsPageSize,
        status: get().statusFilter || undefined,
      });
      set({
        leads: data.items,
        leadsTotal: data.total,
        leadsPage: data.page,
        leadsLoading: false,
      });
    } catch (err) {
      set({
        leadsError: getErrorMessage(err, "Failed to load leads"),
        leadsLoading: false,
      });
    }
  },

  async fetchStatistics() {
    set({ statisticsLoading: true });
    try {
      const statistics = await leadsApi.getStatistics();
      set({ statistics, statisticsLoading: false });
    } catch {
      set({ statisticsLoading: false });
    }
  },

  setLeadsPage(page) {
    set({ leadsPage: page });
    void get().fetchLeads(page);
  },

  setStatusFilter(status) {
    set({ statusFilter: status, leadsPage: 1 });
    void get().fetchLeads(1);
  },
}));
