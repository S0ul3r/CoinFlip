import * as coinRepo from '@/services/database/coinRepository';
import { supabase } from '@/services/supabase/client';
import type { Coin } from '@/types/coin.types';

const PAGE = 200;

/** Pull catalog + latest prices from Supabase into SQLite */
export async function syncCatalogFromSupabase(): Promise<{ coins: number; prices: number }> {
  let offset = 0;
  let totalCoins = 0;
  let totalPrices = 0;

  for (;;) {
    const { data: coins, error } = await supabase
      .from('coins')
      .select('*')
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    if (!coins?.length) break;

    coinRepo.upsertCoins(coins as Coin[]);
    totalCoins += coins.length;
    offset += PAGE;
  }

  coinRepo.clearCoinPrices();
  offset = 0;
  for (;;) {
    const { data: prices, error } = await supabase
      .from('coin_prices')
      .select('coin_id, price, source, source_url, scraped_at')
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (error) throw error;
    if (!prices?.length) break;

    coinRepo.upsertCoinPrices(
      prices.map((p) => ({
        coin_id: p.coin_id as string,
        price: Number(p.price),
        source: p.source as string,
        source_url: (p.source_url as string) ?? null,
        scraped_at: p.scraped_at as string,
      })),
    );
    totalPrices += prices.length;
    offset += PAGE;
  }

  return { coins: totalCoins, prices: totalPrices };
}
