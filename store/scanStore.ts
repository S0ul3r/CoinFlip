import type { CoinIdentificationResult, IdentificationCandidate } from '@/types/coin.types';
import { create } from 'zustand';

type ScanState = {
  imageUri: string | null;
  identification: CoinIdentificationResult | null;
  matchedCoinId: string | null;
  candidates: IdentificationCandidate[];
  setScan: (payload: {
    imageUri: string;
    identification: CoinIdentificationResult;
    matchedCoinId: string | null;
    candidates?: IdentificationCandidate[];
  }) => void;
  clear: () => void;
};

export const useScanStore = create<ScanState>((set) => ({
  imageUri: null,
  identification: null,
  matchedCoinId: null,
  candidates: [],
  setScan: (payload) =>
    set({
      ...payload,
      candidates: payload.candidates ?? [],
    }),
  clear: () =>
    set({ imageUri: null, identification: null, matchedCoinId: null, candidates: [] }),
}));
