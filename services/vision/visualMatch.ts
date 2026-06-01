import type { Coin } from '@/types/coin.types';
import * as coinRepo from '@/services/database/coinRepository';
import { getAllCoinImageHashes } from '@/services/database/coinHashRepository';
import { hammingDistanceHex, visualScoreFromDistance } from './dHash';

export type VisualMatchCandidate = {
  coinId: string;
  side: 'obverse' | 'reverse';
  distance: number;
  visualScore: number;
};

const TOP_N = 20;

export function findVisualMatchCandidates(userHash: string): VisualMatchCandidate[] {
  const rows = getAllCoinImageHashes();
  if (!rows.length) return [];

  const byCoin = new Map<string, VisualMatchCandidate>();

  for (const row of rows) {
    const distance = hammingDistanceHex(userHash, row.hash);
    const visualScore = visualScoreFromDistance(distance);
    const prev = byCoin.get(row.coin_id);
    if (!prev || distance < prev.distance) {
      byCoin.set(row.coin_id, {
        coinId: row.coin_id,
        side: row.side,
        distance,
        visualScore,
      });
    }
  }

  return [...byCoin.values()].sort((a, b) => a.distance - b.distance).slice(0, TOP_N);
}

export function metadataScoreForCoin(
  coin: Coin,
  fields: { year: number | null; denomination: number | null },
): number {
  let score = 0;
  if (fields.year != null && coin.year != null) {
    score += fields.year === coin.year ? 30 : -20;
  }
  if (fields.denomination != null && coin.denomination != null) {
    score += Number(fields.denomination) === Number(coin.denomination) ? 25 : -12;
  }
  return score;
}
