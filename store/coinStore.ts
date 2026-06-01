import { create } from 'zustand';

/** Reserved for global catalogue UI state (filters, pinned coins, etc.) */
export const useCoinStore = create<{
  lastSyncedAt: string | null;
  setLastSyncedAt: (iso: string | null) => void;
}>((set) => ({
  lastSyncedAt: null,
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));
