import type { Coin } from '@/types/coin.types';
import type { CoinIdentificationResult } from '@/types/coin.types';
import * as coinRepo from '@/services/database/coinRepository';
import { extractCoinFieldsFromImage } from './ocr';
import { computeDHashFromImageUri } from './imageHash';
import {
  findVisualMatchCandidates,
  metadataScoreForCoin,
  type VisualMatchCandidate,
} from './visualMatch';

export const HYBRID_CONFIDENCE_AUTO = 0.72;
export const HYBRID_CONFIDENCE_MIN = 0.42;

export type HybridCandidate = {
  coinId: string;
  score: number;
  visualDistance: number;
};

export type HybridIdentificationOutput = {
  identification: CoinIdentificationResult;
  matchedCoinId: string | null;
  candidates: HybridCandidate[];
};

function scoreHybrid(
  visual: VisualMatchCandidate[],
  ocr: { year: number | null; denomination: number | null },
): HybridCandidate[] {
  const scored: HybridCandidate[] = [];

  for (const v of visual) {
    const coin = coinRepo.getCoinById(v.coinId);
    if (!coin) continue;
    const meta = metadataScoreForCoin(coin, ocr);
    const score = v.visualScore + meta;
    scored.push({ coinId: v.coinId, score, visualDistance: v.distance });
  }

  if (ocr.year != null || ocr.denomination != null) {
    const metaMatches = coinRepo.searchCoins({
      year: ocr.year ?? undefined,
      denomination: ocr.denomination ?? undefined,
      limit: 40,
    });
    for (const coin of metaMatches) {
      if (scored.some((s) => s.coinId === coin.id)) continue;
      const meta = metadataScoreForCoin(coin, ocr);
      if (meta <= 0) continue;
      scored.push({ coinId: coin.id, score: meta, visualDistance: 64 });
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

function buildIdentification(
  coin: Coin | null,
  ocr: { year: number | null; denomination: number | null; rawText: string },
  confidence: number,
): CoinIdentificationResult {
  const notes =
    ocr.rawText.trim().length > 0
      ? 'Identyfikacja hybrydowa (OCR + dopasowanie wizualne)'
      : 'Identyfikacja wizualna (OCR wymaga development build — nie działa w Expo Go)';

  return {
    name: coin?.name ?? 'Nieznana moneta',
    year: ocr.year ?? coin?.year ?? null,
    denomination: ocr.denomination ?? coin?.denomination ?? null,
    denomination_currency: 'PLN',
    series: coin?.series ?? null,
    material: coin?.material ?? null,
    mint: coin?.mint ?? null,
    condition_estimate: null,
    confidence,
    description: coin?.description ?? null,
    is_commemorative: (coin?.category ?? '').includes('okolicznosciowe') || coin?.series != null,
    notes,
  };
}

export async function identifyCoinHybrid(imageUri: string): Promise<HybridIdentificationOutput> {
  const [userHash, ocr] = await Promise.all([
    computeDHashFromImageUri(imageUri),
    extractCoinFieldsFromImage(imageUri),
  ]);

  const visual = findVisualMatchCandidates(userHash);
  const ranked = scoreHybrid(visual, ocr);

  const metadataMatch = coinRepo.findBestCatalogMatch({
    name: '',
    year: ocr.year,
    denomination: ocr.denomination,
    material: null,
  });

  let best = ranked[0] ?? null;
  if (metadataMatch && (!best || best.score < 55)) {
    const metaOnly = metadataScoreForCoin(metadataMatch, ocr) + 10;
    if (!best || metaOnly > best.score) {
      best = { coinId: metadataMatch.id, score: metaOnly, visualDistance: 64 };
    }
  }

  const topScore = best?.score ?? 0;
  const confidence = Math.min(0.98, Math.max(0.1, topScore / 80));
  const matchedCoin =
    best && confidence >= HYBRID_CONFIDENCE_MIN ? coinRepo.getCoinById(best.coinId) : null;

  const matchedCoinId =
    best && confidence >= HYBRID_CONFIDENCE_AUTO ? best.coinId : matchedCoin?.id ?? null;

  return {
    identification: buildIdentification(matchedCoin, ocr, confidence),
    matchedCoinId,
    candidates: ranked.slice(0, 5),
  };
}
