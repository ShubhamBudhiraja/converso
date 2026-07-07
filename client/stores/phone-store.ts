"use client";

import { create } from "zustand";

import {
  ApiError,
  DEFAULT_PAGE_SIZE,
  NumberType,
  PhoneNumber,
  TwilioAvailableNumber,
  TwilioConnection,
  getApiErrorMessage,
  phoneApi,
} from "@/lib/api";

function getErrorMessage(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}

type PhoneStore = {
  connections: TwilioConnection[];
  connectionsLoading: boolean;
  connectionsError: string | null;
  connectionsPage: number;
  connectionsTotal: number;
  connectionsPageSize: number;
  selectedConnectionIds: string[];
  actionLoading: boolean;

  currentConnection: TwilioConnection | null;
  phoneNumbers: PhoneNumber[];
  phoneNumbersPage: number;
  phoneNumbersTotal: number;
  phoneNumbersPageSize: number;
  detailLoading: boolean;
  detailError: string | null;
  selectedPhoneNumberIds: string[];
  testMessage: string | null;
  testLoading: boolean;

  availableNumbers: TwilioAvailableNumber[];
  searchLoading: boolean;

  fetchConnections: (page?: number) => Promise<void>;
  setConnectionsPage: (page: number) => void;
  createConnection: (data: { account_sid: string; auth_token: string; label?: string }) => Promise<void>;
  updateConnection: (id: string, data: { label?: string }) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  bulkDeleteConnections: (ids: string[]) => Promise<void>;

  fetchConnectionDetail: (connectionId: string) => Promise<void>;
  setPhoneNumbersPage: (page: number) => void;
  fetchPhoneNumbers: (connectionId: string, page?: number) => Promise<void>;
  testConnection: (connectionId: string) => Promise<void>;
  importPhoneNumber: (data: {
    twilio_connection_id: string;
    phone_number: string;
    label: string;
  }) => Promise<void>;
  purchasePhoneNumber: (data: {
    twilio_connection_id: string;
    phone_number: string;
    label: string;
  }) => Promise<void>;
  deletePhoneNumber: (id: string) => Promise<void>;
  bulkDeletePhoneNumbers: (ids: string[]) => Promise<void>;
  searchAvailableNumbers: (
    connectionId: string,
    params: { country: string; area_code?: string; number_type: NumberType },
  ) => Promise<TwilioAvailableNumber[]>;
  registerWithElevenLabs: (
    phoneNumberId: string,
    elevenlabsConnectionId: string,
  ) => Promise<void>;

  toggleConnectionSelect: (id: string) => void;
  toggleAllConnections: () => void;
  clearConnectionSelection: () => void;
  togglePhoneNumberSelect: (id: string) => void;
  toggleAllPhoneNumbers: () => void;
  clearPhoneNumberSelection: () => void;
  clearAvailableNumbers: () => void;
  resetDetail: () => void;
};

export const usePhoneStore = create<PhoneStore>((set, get) => ({
  connections: [],
  connectionsLoading: false,
  connectionsError: null,
  connectionsPage: 1,
  connectionsTotal: 0,
  connectionsPageSize: DEFAULT_PAGE_SIZE,
  selectedConnectionIds: [],
  actionLoading: false,

  currentConnection: null,
  phoneNumbers: [],
  phoneNumbersPage: 1,
  phoneNumbersTotal: 0,
  phoneNumbersPageSize: DEFAULT_PAGE_SIZE,
  detailLoading: false,
  detailError: null,
  selectedPhoneNumberIds: [],
  testMessage: null,
  testLoading: false,

  availableNumbers: [],
  searchLoading: false,

  async fetchConnections(page) {
    const targetPage = page ?? get().connectionsPage;
    set({ connectionsLoading: true, connectionsError: null });
    try {
      const data = await phoneApi.listConnections({
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
        connectionsError: getErrorMessage(err, "Failed to load Twilio accounts"),
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
      await phoneApi.createConnection(data);
      await get().fetchConnections();
    } finally {
      set({ actionLoading: false });
    }
  },

  async updateConnection(id, data) {
    set({ actionLoading: true });
    try {
      await phoneApi.updateConnection(id, data);
      await get().fetchConnections();
    } finally {
      set({ actionLoading: false });
    }
  },

  async deleteConnection(id) {
    set({ actionLoading: true });
    try {
      await phoneApi.deleteConnection(id);
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
      await phoneApi.bulkDeleteConnections(ids);
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
      phoneNumbers: [],
      phoneNumbersPage: 1,
      phoneNumbersTotal: 0,
    });
    try {
      const current = await phoneApi.getConnection(connectionId);
      set({
        currentConnection: current,
        detailLoading: false,
      });
      await get().fetchPhoneNumbers(connectionId, 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        set({
          detailError: "Twilio account not found",
          currentConnection: null,
          phoneNumbers: [],
          detailLoading: false,
        });
        return;
      }
      set({
        detailError: getErrorMessage(err, "Failed to load phone numbers"),
        currentConnection: null,
        phoneNumbers: [],
        detailLoading: false,
      });
    }
  },

  async fetchPhoneNumbers(connectionId, page) {
    const targetPage = page ?? get().phoneNumbersPage;
    set({ detailLoading: true, detailError: null });
    try {
      const data = await phoneApi.listPhoneNumbers({
        twilio_connection_id: connectionId,
        page: targetPage,
        page_size: get().phoneNumbersPageSize,
      });
      const nextPage =
        data.total > 0 && data.items.length === 0 && targetPage > 1
          ? Math.max(1, Math.ceil(data.total / data.page_size))
          : targetPage;
      if (nextPage !== targetPage) {
        await get().fetchPhoneNumbers(connectionId, nextPage);
        return;
      }
      set({
        phoneNumbers: data.items,
        phoneNumbersTotal: data.total,
        phoneNumbersPage: data.page,
        detailLoading: false,
      });
    } catch (err) {
      set({
        detailError: getErrorMessage(err, "Failed to load phone numbers"),
        phoneNumbers: [],
        detailLoading: false,
      });
    }
  },

  setPhoneNumbersPage(page) {
    const connectionId = get().currentConnection?.id;
    if (!connectionId) return;
    set({ phoneNumbersPage: page });
    void get().fetchPhoneNumbers(connectionId, page);
  },

  async testConnection(connectionId) {
    set({ testLoading: true, testMessage: null });
    try {
      const result = await phoneApi.testConnection(connectionId);
      set({ testMessage: result.message });
      await get().fetchConnectionDetail(connectionId);
    } catch (err) {
      set({ testMessage: getErrorMessage(err, "Failed to test connection") });
    } finally {
      set({ testLoading: false });
    }
  },

  async importPhoneNumber(data) {
    set({ actionLoading: true });
    try {
      await phoneApi.importPhoneNumber(data);
      await get().fetchConnectionDetail(data.twilio_connection_id);
    } finally {
      set({ actionLoading: false });
    }
  },

  async purchasePhoneNumber(data) {
    set({ actionLoading: true });
    try {
      await phoneApi.purchasePhoneNumber(data);
      await get().fetchConnectionDetail(data.twilio_connection_id);
    } finally {
      set({ actionLoading: false });
    }
  },

  async deletePhoneNumber(id) {
    const connectionId = get().currentConnection?.id;
    set({ actionLoading: true });
    try {
      await phoneApi.deletePhoneNumber(id);
      if (connectionId) {
        await get().fetchConnectionDetail(connectionId);
      }
    } catch (err) {
      set({ detailError: getErrorMessage(err, "Failed to delete phone number") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async bulkDeletePhoneNumbers(ids) {
    const connectionId = get().currentConnection?.id;
    set({ actionLoading: true });
    try {
      await phoneApi.bulkDeletePhoneNumbers(ids);
      set({ selectedPhoneNumberIds: [] });
      if (connectionId) {
        await get().fetchConnectionDetail(connectionId);
      }
    } catch (err) {
      set({ detailError: getErrorMessage(err, "Failed to delete phone numbers") });
      throw err;
    } finally {
      set({ actionLoading: false });
    }
  },

  async searchAvailableNumbers(connectionId, params) {
    set({ searchLoading: true });
    try {
      const numbers = await phoneApi.listAvailableNumbers(connectionId, {
        country: params.country.trim().toUpperCase(),
        area_code: params.area_code?.trim() || undefined,
        number_type: params.number_type,
        limit: 20,
      });
      set({ availableNumbers: numbers, searchLoading: false });
      return numbers;
    } catch (err) {
      set({ availableNumbers: [], searchLoading: false });
      throw err;
    }
  },

  async registerWithElevenLabs(phoneNumberId, elevenlabsConnectionId) {
    const connectionId = get().currentConnection?.id;
    set({ actionLoading: true });
    try {
      await phoneApi.registerWithElevenLabs(phoneNumberId, {
        elevenlabs_connection_id: elevenlabsConnectionId,
      });
      if (connectionId) {
        await get().fetchConnectionDetail(connectionId);
      }
    } finally {
      set({ actionLoading: false });
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

  togglePhoneNumberSelect(id) {
    set((state) => ({
      selectedPhoneNumberIds: state.selectedPhoneNumberIds.includes(id)
        ? state.selectedPhoneNumberIds.filter((item) => item !== id)
        : [...state.selectedPhoneNumberIds, id],
    }));
  },

  toggleAllPhoneNumbers() {
    const { phoneNumbers, selectedPhoneNumberIds } = get();
    const pageIds = phoneNumbers.map((item) => item.id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedPhoneNumberIds.includes(id));
    if (allPageSelected) {
      set({
        selectedPhoneNumberIds: selectedPhoneNumberIds.filter((id) => !pageIds.includes(id)),
      });
      return;
    }
    set({
      selectedPhoneNumberIds: [...new Set([...selectedPhoneNumberIds, ...pageIds])],
    });
  },

  clearPhoneNumberSelection() {
    set({ selectedPhoneNumberIds: [] });
  },

  clearAvailableNumbers() {
    set({ availableNumbers: [] });
  },

  resetDetail() {
    set({
      currentConnection: null,
      phoneNumbers: [],
      phoneNumbersPage: 1,
      phoneNumbersTotal: 0,
      detailLoading: false,
      detailError: null,
      selectedPhoneNumberIds: [],
      testMessage: null,
      testLoading: false,
      availableNumbers: [],
      searchLoading: false,
    });
  },
}));
