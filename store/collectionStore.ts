import { create } from 'zustand';

/** Reserved for optimistic collection updates / draft forms */
export const useCollectionStore = create<{
  draftPurchasePrice: string;
  setDraftPurchasePrice: (v: string) => void;
}>((set) => ({
  draftPurchasePrice: '',
  setDraftPurchasePrice: (draftPurchasePrice) => set({ draftPurchasePrice }),
}));
