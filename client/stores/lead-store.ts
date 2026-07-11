import { create } from "zustand";

import { LeadDatePreset } from "@/lib/leads";
import {
    DEFAULT_PAGE_SIZE,
    Lead,
    LeadStatistics,
    LeadStatus,
    getApiErrorMessage,
    leadsApi,
} from "@/lib/api";
import {
    getDefaultLeadCustomRange,
    getLeadDateRange,
} from "@/lib/leads";

function getErrorMessage(err: unknown, fallback: string) {
    return getApiErrorMessage(err, fallback);
}

const defaultCustomRange = getDefaultLeadCustomRange();

type LeadStore = {
    leads: Lead[];
    leadsLoading: boolean;
    leadsError: string | null;
    leadsPage: number;
    leadsTotal: number;
    leadsPageSize: number;
    searchQuery: string;
    statusFilter: LeadStatus | "";
    campaignFilter: string;
    datePreset: LeadDatePreset;
    customStart: string;
    customEnd: string;
    statistics: LeadStatistics | null;
    statisticsLoading: boolean;

    fetchLeads: (page?: number) => Promise<void>;
    fetchStatistics: () => Promise<void>;
    setLeadsPage: (page: number) => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (status: LeadStatus | "") => void;
    setCampaignFilter: (campaignId: string) => void;
    setDatePreset: (preset: LeadDatePreset) => void;
    setCustomStart: (value: string) => void;
    setCustomEnd: (value: string) => void;
};

export const useLeadStore = create<LeadStore>((set, get) => ({
    leads: [],
    leadsLoading: false,
    leadsError: null,
    leadsPage: 1,
    leadsTotal: 0,
    leadsPageSize: DEFAULT_PAGE_SIZE,
    searchQuery: "",
    statusFilter: "",
    campaignFilter: "",
    datePreset: "all",
    customStart: defaultCustomRange.start,
    customEnd: defaultCustomRange.end,
    statistics: null,
    statisticsLoading: false,

    async fetchLeads(page) {
        const state = get();
        const targetPage = page ?? state.leadsPage;
        const { start_date, end_date } = getLeadDateRange(state.datePreset, {
            start: state.customStart,
            end: state.customEnd,
        });

        set({ leadsLoading: true, leadsError: null });
        try {
            const data = await leadsApi.listLeads({
                page: targetPage,
                page_size: state.leadsPageSize,
                status: state.statusFilter || undefined,
                campaign_id: state.campaignFilter || undefined,
                search: state.searchQuery.trim() || undefined,
                start_date,
                end_date,
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
        get().fetchLeads(page);
    },

    setSearchQuery(query) {
        set({ searchQuery: query, leadsPage: 1 });
        get().fetchLeads(1);
    },

    setStatusFilter(status) {
        set({ statusFilter: status, leadsPage: 1 });
        get().fetchLeads(1);
    },

    setCampaignFilter(campaignId) {
        set({ campaignFilter: campaignId, leadsPage: 1 });
        get().fetchLeads(1);
    },

    setDatePreset(preset) {
        set({ datePreset: preset, leadsPage: 1 });
        get().fetchLeads(1);
    },

    setCustomStart(value) {
        set({ customStart: value, leadsPage: 1 });
        if (get().datePreset === "custom") {
            get().fetchLeads(1);
        }
    },

    setCustomEnd(value) {
        set({ customEnd: value, leadsPage: 1 });
        if (get().datePreset === "custom") {
            get().fetchLeads(1);
        }
    },
}));
