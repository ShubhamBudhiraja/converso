import { create } from "zustand";

import {
  ApiError,
  Campaign,
  CampaignCall,
  ContactList,
  DEFAULT_PAGE_SIZE,
  campaignApi,
  getApiErrorMessage,
} from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type CampaignStore = {
  contactLists: ContactList[];
  contactListsLoading: boolean;
  contactListsError: string | null;
  contactListsPage: number;
  contactListsTotal: number;
  contactListsPageSize: number;

  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignsError: string | null;
  campaignsPage: number;
  campaignsTotal: number;
  campaignsPageSize: number;

  currentCampaign: Campaign | null;
  campaignCalls: CampaignCall[];
  detailLoading: boolean;
  detailError: string | null;
  callsPage: number;
  callsTotal: number;
  callsPageSize: number;

  actionLoading: boolean;

  fetchContactLists: (page?: number) => Promise<void>;
  setContactListsPage: (page: number) => void;
  importContactList: (data: {
    file: File;
    name: string;
    first_name_column: string;
    last_name_column: string;
    phone_number_column: string;
    address_column?: string;
    second_phone_column?: string;
    country_code?: string;
    accept_partial?: boolean;
  }) => Promise<void>;
  deleteContactList: (id: string) => Promise<void>;
  updateContactList: (id: string, data: { name: string }) => Promise<void>;
  downloadContactListCsv: (list: ContactList) => Promise<void>;

  fetchCampaigns: (page?: number) => Promise<void>;
  setCampaignsPage: (page: number) => void;
  createCampaign: (data: {
    name: string;
    caller_agent_id: string;
    list_ids: string[];
    scheduled_at: string;
    schedule_settings: {
      timezone: string;
      retry_attempts: number;
      retry_interval: "24h" | "48h" | "72h";
    };
  }) => Promise<Campaign>;
  cancelCampaign: (id: string) => Promise<void>;
  startCampaign: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;

  fetchCampaignDetail: (id: string) => Promise<void>;
  setCallsPage: (page: number) => void;
  resetDetail: () => void;
};

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  contactLists: [],
  contactListsLoading: false,
  contactListsError: null,
  contactListsPage: 1,
  contactListsTotal: 0,
  contactListsPageSize: DEFAULT_PAGE_SIZE,

  campaigns: [],
  campaignsLoading: false,
  campaignsError: null,
  campaignsPage: 1,
  campaignsTotal: 0,
  campaignsPageSize: DEFAULT_PAGE_SIZE,

  currentCampaign: null,
  campaignCalls: [],
  detailLoading: false,
  detailError: null,
  callsPage: 1,
  callsTotal: 0,
  callsPageSize: DEFAULT_PAGE_SIZE,

  actionLoading: false,

  async fetchContactLists(page) {
    const targetPage = page ?? get().contactListsPage;
    set({ contactListsLoading: true, contactListsError: null });
    try {
      const data = await campaignApi.listContactLists({
        page: targetPage,
        page_size: get().contactListsPageSize,
      });
      set({
        contactLists: data.items,
        contactListsTotal: data.total,
        contactListsPage: data.page,
        contactListsLoading: false,
      });
    } catch (err) {
      set({
        contactListsError: getErrorMessage(err, "Failed to load contact lists"),
        contactListsLoading: false,
      });
    }
  },

  setContactListsPage(page) {
    set({ contactListsPage: page });
    void get().fetchContactLists(page);
  },

  async importContactList(data) {
    set({ actionLoading: true });
    try {
      await campaignApi.importContactList(data);
      await get().fetchContactLists();
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteContactList(id) {
    set({ actionLoading: true });
    try {
      await campaignApi.deleteContactList(id);
      await get().fetchContactLists();
    } catch (err) {
      set({
        contactListsError: getErrorMessage(err, "Failed to delete contact list"),
      });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async updateContactList(id, data) {
    set({ actionLoading: true });
    try {
      await campaignApi.updateContactList(id, data);
      await get().fetchContactLists();
    } catch (err) {
      set({
        contactListsError: getErrorMessage(err, "Failed to update contact list"),
      });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async downloadContactListCsv(list) {
    set({ contactListsError: null });
    try {
      await campaignApi.downloadContactListCsv(list.id, list.name);
    } catch (err) {
      set({
        contactListsError: getErrorMessage(err, "Failed to download contact list"),
      });
      throw err;
    }
  },

  async fetchCampaigns(page) {
    const targetPage = page ?? get().campaignsPage;
    set({ campaignsLoading: true, campaignsError: null });
    try {
      const data = await campaignApi.listCampaigns({
        page: targetPage,
        page_size: get().campaignsPageSize,
      });
      set({
        campaigns: data.items,
        campaignsTotal: data.total,
        campaignsPage: data.page,
        campaignsLoading: false,
      });
    } catch (err) {
      set({
        campaignsError: getErrorMessage(err, "Failed to load campaigns"),
        campaignsLoading: false,
      });
    }
  },

  setCampaignsPage(page) {
    set({ campaignsPage: page });
    void get().fetchCampaigns(page);
  },

  async createCampaign(data) {
    set({ actionLoading: true });
    try {
      const campaign = await campaignApi.createCampaign(data);
      await get().fetchCampaigns();
      return campaign;
    } finally {
      set({ actionLoading: false });
    }
  },

  async cancelCampaign(id) {
    set({ actionLoading: true });
    try {
      await campaignApi.cancelCampaign(id);
      await get().fetchCampaigns();
      if (get().currentCampaign?.id === id) {
        await get().fetchCampaignDetail(id);
      }
    } finally {
      set({ actionLoading: false });
    }
  },

  async startCampaign(id) {
    set({ actionLoading: true });
    try {
      await campaignApi.startCampaign(id);
      await get().fetchCampaigns();
      if (get().currentCampaign?.id === id) {
        await get().fetchCampaignDetail(id);
      }
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteCampaign(id) {
    set({ actionLoading: true });
    try {
      await campaignApi.deleteCampaign(id);
      await get().fetchCampaigns();
    } catch (err) {
      set({
        campaignsError: getErrorMessage(err, "Failed to delete campaign"),
      });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async fetchCampaignDetail(id) {
    set({ detailLoading: true, detailError: null });
    try {
      const [campaign, calls] = await Promise.all([
        campaignApi.getCampaign(id),
        campaignApi.listCampaignCalls(id, {
          page: get().callsPage,
          page_size: get().callsPageSize,
        }),
      ]);
      set({
        currentCampaign: campaign,
        campaignCalls: calls.items,
        callsTotal: calls.total,
        detailLoading: false,
      });
    } catch (err) {
      set({
        detailError: getErrorMessage(err, "Failed to load campaign"),
        detailLoading: false,
      });
    }
  },

  setCallsPage(page) {
    set({ callsPage: page });
    const campaignId = get().currentCampaign?.id;
    if (campaignId) {
      void get().fetchCampaignDetail(campaignId);
    }
  },

  resetDetail() {
    set({
      currentCampaign: null,
      campaignCalls: [],
      detailLoading: false,
      detailError: null,
      callsPage: 1,
      callsTotal: 0,
    });
  },
}));
