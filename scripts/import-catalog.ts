/**
 * Upsert normalized JSON into Supabase (`coins`, `coin_prices`, `coin_sources`).
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment (never ship the service key in the app).
 */
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { CatalogCoinRow, CatalogPriceRow, CoinSourceRow } from './catalog/schemas';
import { REPO_ROOT } from './lib/repoRoot';

loadEnv({ path: path.join(REPO_ROOT, '.env') });

const COINS_FILE = path.join(REPO_ROOT, 'data', 'catalog', 'normalized', 'coins.json');
const PRICES_FILE = path.join(REPO_ROOT, 'data', 'catalog', 'normalized', 'coin-prices.json');
const SOURCES_FILE = path.join(REPO_ROOT, 'data', 'catalog', 'normalized', 'coin-sources.json');

const BATCH = 40;
/** PostgREST builds `in.(...)` in the query string; huge lists → URL too long → HTTP 400. */
const DELETE_IN_CHUNK = 40;

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return stripQuotes(v);
}

/** PostgREST often returns only `message` when logged; include code/details/hint for debugging. */
function logPostgrestError(context: string, err: { message?: string; code?: string; details?: string; hint?: string }): void {
  console.error(
    `[catalog:import] ${context}`,
    JSON.stringify(
      { message: err.message, code: err.code, details: err.details, hint: err.hint },
      null,
      2,
    ),
  );
}

async function readJsonFile<T>(file: string): Promise<T> {
  const buf = await fs.readFile(file, 'utf8');
  return JSON.parse(buf) as T;
}

async function deleteCoinPricesMennicaInChunks(
  supabase: ReturnType<typeof createClient>,
  coinIds: string[],
): Promise<void> {
  for (let i = 0; i < coinIds.length; i += DELETE_IN_CHUNK) {
    const chunk = coinIds.slice(i, i + DELETE_IN_CHUNK);
    const { error } = await supabase.from('coin_prices').delete().eq('source', 'mennica').in('coin_id', chunk);
    if (error) {
      logPostgrestError(`coin_prices delete (mennica) chunk offset=${i} size=${chunk.length}`, error);
      throw error;
    }
  }
}

async function deleteCoinSourcesInChunks(
  supabase: ReturnType<typeof createClient>,
  source: 'mennica' | 'nbp',
  sourceIds: string[],
): Promise<void> {
  for (let i = 0; i < sourceIds.length; i += DELETE_IN_CHUNK) {
    const chunk = sourceIds.slice(i, i + DELETE_IN_CHUNK);
    const { error } = await supabase.from('coin_sources').delete().eq('source', source).in('source_id', chunk);
    if (error) {
      logPostgrestError(`coin_sources delete (${source}) chunk offset=${i} size=${chunk.length}`, error);
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!/^https:\/\//i.test(url)) {
    console.warn('[catalog:import] SUPABASE_URL should use https://');
  }
  if (/\/rest(\/|$)/i.test(url)) {
    console.warn(
      '[catalog:import] SUPABASE_URL should be the project base (e.g. https://xxx.supabase.co), not a /rest/v1 URL.',
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { coins } = await readJsonFile<{ coins: CatalogCoinRow[] }>(COINS_FILE);
  const { prices } = await readJsonFile<{ prices: CatalogPriceRow[] }>(PRICES_FILE);
  const { sources } = await readJsonFile<{ sources: CoinSourceRow[] }>(SOURCES_FILE);

  const now = new Date().toISOString();
  const coinRows = coins.map((c) => ({
    ...c,
    is_custom: false,
    updated_at: now,
  }));

  for (let i = 0; i < coinRows.length; i += BATCH) {
    const chunk = coinRows.slice(i, i + BATCH);
    const { error } = await supabase.from('coins').upsert(chunk, { onConflict: 'id' });
    if (error) {
      logPostgrestError(`coins upsert batch offset=${i} size=${chunk.length}`, error);
      throw error;
    }
  }

  const mennicaCoinIds = [...new Set(prices.filter((p) => p.source === 'mennica').map((p) => p.coin_id))];
  if (mennicaCoinIds.length > 0) {
    await deleteCoinPricesMennicaInChunks(supabase, mennicaCoinIds);
  }

  const priceInserts = prices.map((p) => ({
    coin_id: p.coin_id,
    price: p.price,
    source: p.source,
    source_url: p.source_url,
    scraped_at: p.scraped_at,
  }));
  for (let i = 0; i < priceInserts.length; i += BATCH) {
    const chunk = priceInserts.slice(i, i + BATCH);
    const { error } = await supabase.from('coin_prices').insert(chunk);
    if (error) {
      logPostgrestError(`coin_prices insert batch offset=${i} size=${chunk.length}`, error);
      throw error;
    }
  }

  const sourceRows = sources.map((s) => ({
    coin_id: s.coin_id,
    source: s.source,
    source_id: s.source_id,
    source_url: s.source_url,
    source_payload: s.source_payload,
    scraped_at: now,
    match_status: s.match_status,
  }));

  const mennicaSourceIds = sourceRows.filter((s) => s.source === 'mennica' && s.source_id).map((s) => s.source_id as string);
  if (mennicaSourceIds.length > 0) {
    await deleteCoinSourcesInChunks(supabase, 'mennica', mennicaSourceIds);
  }
  const nbpSourceIds = sourceRows.filter((s) => s.source === 'nbp' && s.source_id).map((s) => s.source_id as string);
  if (nbpSourceIds.length > 0) {
    await deleteCoinSourcesInChunks(supabase, 'nbp', nbpSourceIds);
  }

  for (let i = 0; i < sourceRows.length; i += BATCH) {
    const chunk = sourceRows.slice(i, i + BATCH);
    const { error } = await supabase.from('coin_sources').insert(chunk);
    if (error) {
      logPostgrestError(`coin_sources insert batch offset=${i} size=${chunk.length}`, error);
      throw error;
    }
  }

  console.info(`[catalog:import] Upserted coins=${coins.length}, inserted prices=${prices.length}, sources=${sources.length}`);
}

main().catch((e) => {
  if (e && typeof e === 'object' && 'message' in e) {
    const o = e as { message?: string; code?: string; details?: string; hint?: string };
    if (o.code || o.details || o.hint) {
      console.error('[catalog:import] Unhandled PostgREST error:', JSON.stringify(o, null, 2));
    }
  }
  console.error(e);
  process.exit(1);
});
