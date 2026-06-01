import * as coinRepo from '@/services/database/coinRepository';
import { supabase } from '@/services/supabase/client';

export function getLocalLatestMarketPrice(coinId: string): number | null {
  const row = coinRepo.getLatestPriceForCoin(coinId);
  return row ? row.price : null;
}

export function getLocalIssuePrice(coinId: string): number | null {
  const coin = coinRepo.getCoinById(coinId);
  return coin?.issue_price ?? null;
}

/** Ask Edge Function to refresh prices for all coins (MVP batch) */
export async function triggerPriceRefresh(): Promise<{ updated: number }> {
  const { data, error } = await supabase.functions.invoke<{ updated: number }>('refresh-prices', {
    body: {},
  });
  if (error) throw new Error(error.message ?? 'refresh-prices failed');
  return { updated: data?.updated ?? 0 };
}
