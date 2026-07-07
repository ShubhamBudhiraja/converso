"use client";

import { create } from "zustand";

import {
  ApiError,
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
  selectedConnectionIds: string[];
  actionLoading: boolean;

  currentConnection: TwilioConnection | null;
  phoneNumbers: PhoneNumber[];
  detailLoading: boolean;
  detailError: string | null;
  selectedPhoneNumberIds: string[];
  testMessage: string | null;
  testLoading: boolean;

  availableNumbers: TwilioAvailableNumber[];
  searchLoading: boolean;

  fetchConnections: () => Promise<void>;
  createConnection: (data: { account_sid: string; auth_token: string; label?: string }) => Promise<void>;
  updateConnection: (id: string, data: { label?: string }) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  bulkDeleteConnections: (ids: string[]) => Promise<void>;

  fetchConnectionDetail: (connectionId: string) => Promise<void>;
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
  selectedConnectionIds: [],
  actionLoading: false,

  currentConnection: null,
  phoneNumbers: [],
  detailLoading: false,
  detailError: null,
  selectedPhoneNumberIds: [],
  testMessage: null,
  testLoading: false,

  availableNumbers: [],
  searchLoading: false,

  async fetchConnections() {
    set({ connectionsLoading: true, connectionsError: null });
    try {
      const data = await phoneApi.listConnections();
      set((state) => ({
        connections: data,
        connectionsLoading: false,
        selectedConnectionIds: state.selectedConnectionIds.filter((id) =>
          data.some((item) => item.id === id),
        ),
      }));
    } catch (err) {
      set({
        connectionsError: getErrorMessage(err, "Failed to load Twilio accounts"),
        connectionsLoading: false,
      });
    }
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
    set({ detailLoading: true, detailError: null });
    try {
      const [current, numbers] = await Promise.all([
        phoneApi.getConnection(connectionId),
        phoneApi.listPhoneNumbers(),
      ]);
      const filtered = numbers.filter((item) => item.twilio_connection_id === connectionId);
      set((state) => ({
        currentConnection: current,
        phoneNumbers: filtered,
        detailLoading: false,
        selectedPhoneNumberIds: state.selectedPhoneNumberIds.filter((id) =>
          filtered.some((item) => item.id === id),
        ),
      }));
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
    if (selectedConnectionIds.length === connections.length) {
      set({ selectedConnectionIds: [] });
      return;
    }
    set({ selectedConnectionIds: connections.map((item) => item.id) });
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
    if (selectedPhoneNumberIds.length === phoneNumbers.length) {
      set({ selectedPhoneNumberIds: [] });
      return;
    }
    set({ selectedPhoneNumberIds: phoneNumbers.map((item) => item.id) });
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
