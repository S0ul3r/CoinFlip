/**
 * Merge latest NBP and Mennica raw snapshots into normalized coins.json, coin-prices.json, coin-sources.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CatalogCoinRow, CatalogPriceRow, CoinSourceRow } from './catalog/schemas';
import { catalogCoinRowSchema, catalogPriceRowSchema, coinSourceRowSchema } from './catalog/schemas';
import { REPO_ROOT } from './lib/repoRoot';
import { writeJson } from './lib/writeJson';

const NBP_LATEST = path.join(REPO_ROOT, 'data', 'catalog', 'nbp', 'raw', 'latest.json');
const MENNICA_LATEST = path.join(REPO_ROOT, 'data', 'catalog', 'mennica', 'raw', 'latest.json');
const OUT_DIR = path.join(REPO_ROOT, 'data', 'catalog', 'normalized');

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractYearFromText(text: string): number | null {
  const m = text.match(/\b(19|20)\d{2}\b/g);
  if (!m?.length) return null;
  for (const y of m) {
    const n = Number.parseInt(y, 10);
    if (n >= 1960 && n <= 2035) return n;
  }
  return null;
}

function extractDenominationFromText(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*zł/i);
  if (!m) return null;
  return Number.parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
}

function maybeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const m = v.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function maybeInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v !== 'string') return null;
  const digits = v.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function cleanDescription(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const text = v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
  if (!text) return null;
  if (/^strona główna\s*\/?/i.test(text)) return null;
  return text;
}

function wooRetailPln(prices: { price: string; currency_minor_unit?: number }): number {
  const minor = prices.currency_minor_unit ?? 2;
  const raw = Number(prices.price);
  if (!Number.isFinite(raw)) return NaN;
  return raw / 10 ** minor;
}

type NbpSnapshot = {
  coins?: { id: string; source_url: string; raw: Record<string, unknown> }[];
};

type WooProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description?: string;
  prices?: { price: string; currency_minor_unit?: number };
  images?: { src: string; alt?: string }[];
  categories?: { name: string; slug?: string }[];
  stock_availability?: { text?: string; class?: string };
  is_in_stock?: boolean;
};

type MennicaSnapshot = {
  productsByCategory?: Record<string, WooProduct[]>;
};

function nbpRowFromRaw(entry: { id: string; source_url: string; raw: Record<string, unknown> }): CatalogCoinRow {
  const r = entry.raw;
  const title = String(r.title ?? entry.id);
  const desc = cleanDescription(r.description);
  const textBlob = `${title}\n${desc ?? ''}`;
  const material = typeof r.material === 'string' && r.material.trim() ? r.material.trim() : null;
  return {
    id: entry.id,
    is_custom: false,
    name: title.slice(0, 500),
    series: null,
    denomination: maybeNumber(r.denomination) ?? extractDenominationFromText(textBlob),
    year: maybeInt(r.year) ?? extractYearFromText(textBlob),
    mint: 'Narodowy Bank Polski',
    mintage: maybeInt(r.mintage),
    material,
    weight_g: maybeNumber(r.weight_g),
    diameter_mm: maybeNumber(r.diameter_mm),
    quality: typeof r.quality === 'string' && r.quality.trim() ? r.quality.trim() : null,
    description: desc,
    image_obverse: typeof r.image_obverse === 'string' ? r.image_obverse : null,
    image_reverse: typeof r.image_reverse === 'string' ? r.image_reverse : null,
    issue_price: null,
    category: 'nbp',
    source_url: entry.source_url,
  };
}

function mennicaCoinFromProduct(p: WooProduct): CatalogCoinRow {
  const text = `${p.name}\n${p.description ?? ''}`;
  const year = extractYearFromText(text);
  const denomination = extractDenominationFromText(text);
  const imgs = p.images ?? [];
  const obv = imgs.find((i) => /awers/i.test(i.alt ?? ''))?.src ?? imgs[1]?.src ?? imgs[0]?.src ?? null;
  const rev = imgs.find((i) => /rewers/i.test(i.alt ?? ''))?.src ?? imgs[0]?.src ?? null;
  const series =
    p.categories?.find((c) => /nbp|seria|monety/i.test(c.name))?.name ??
    p.categories?.map((c) => c.name).join(' · ') ??
    null;
  let material: string | null = null;
  if (/srebr/i.test(text)) material = 'srebro';
  if (/złot|zlot/i.test(text) && /moneta/i.test(text)) material = material ? `${material}, złoto` : 'złoto';

  return {
    id: `mennica-wc-${p.id}`,
    is_custom: false,
    name: p.name,
    series,
    denomination,
    year,
    mint: 'Mennica Polska',
    mintage: null,
    material,
    weight_g: null,
    diameter_mm: null,
    quality: null,
    description: p.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000) ?? null,
    image_obverse: obv,
    image_reverse: rev,
    issue_price: null,
    category: 'mennica',
    source_url: p.permalink,
  };
}

function bestNbpMatch(nbps: CatalogCoinRow[], m: CatalogCoinRow): CatalogCoinRow | null {
  if (!nbps.length) return null;
  const mn = normalizeName(m.name);
  const my = m.year;
  let best: CatalogCoinRow | null = null;
  let bestScore = 0;
  for (const c of nbps) {
    if (c.id.startsWith('mennica-')) continue;
    const cn = normalizeName(c.name);
    if (my != null && c.year != null && my !== c.year) continue;
    let score = 0;
    if (cn === mn) score += 100;
    if (cn.length > 12 && mn.includes(cn.slice(0, 12))) score += 40;
    if (mn.length > 12 && cn.includes(mn.slice(0, 12))) score += 40;
    if (m.denomination != null && c.denomination != null && m.denomination === c.denomination) score += 20;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 40 ? best : null;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(file, 'utf8');
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const nbp = await readJson<NbpSnapshot>(NBP_LATEST);
  const mennica = await readJson<MennicaSnapshot>(MENNICA_LATEST);

  const coins: CatalogCoinRow[] = [];
  const prices: CatalogPriceRow[] = [];
  const sources: CoinSourceRow[] = [];
  const scrapedAt = new Date().toISOString();

  const nbpRows: CatalogCoinRow[] = [];
  if (nbp?.coins?.length) {
    for (const c of nbp.coins) {
      const row = nbpRowFromRaw(c);
      catalogCoinRowSchema.parse(row);
      nbpRows.push(row);
      coins.push(row);
      sources.push({
        coin_id: row.id,
        source: 'nbp',
        source_id: row.id,
        source_url: row.source_url,
        source_payload: c.raw,
        match_status: 'matched',
      });
    }
  }

  const mProducts: WooProduct[] = [];
  if (mennica?.productsByCategory) {
    for (const arr of Object.values(mennica.productsByCategory)) {
      for (const p of arr as WooProduct[]) mProducts.push(p);
    }
  }
  const seenWoo = new Set<number>();
  for (const p of mProducts) {
    if (seenWoo.has(p.id)) continue;
    seenWoo.add(p.id);

    const mCoin = mennicaCoinFromProduct(p);
    catalogCoinRowSchema.parse(mCoin);

    const priceVal = p.prices ? wooRetailPln(p.prices as { price: string; currency_minor_unit?: number }) : NaN;
    const match = bestNbpMatch(nbpRows, mCoin);
    const payload = {
      woo_id: p.id,
      sku: (p as { sku?: string }).sku,
      stock: p.stock_availability,
      is_in_stock: p.is_in_stock,
      raw_categories: p.categories,
    };

    if (match) {
      if (Number.isFinite(priceVal)) {
        prices.push({
          coin_id: match.id,
          price: priceVal,
          source: 'mennica',
          source_url: p.permalink,
          scraped_at: scrapedAt,
        });
      }
      sources.push({
        coin_id: match.id,
        source: 'mennica',
        source_id: String(p.id),
        source_url: p.permalink,
        source_payload: payload,
        match_status: 'matched',
      });
    } else {
      coins.push(mCoin);
      if (Number.isFinite(priceVal)) {
        prices.push({
          coin_id: mCoin.id,
          price: priceVal,
          source: 'mennica',
          source_url: p.permalink,
          scraped_at: scrapedAt,
        });
      }
      sources.push({
        coin_id: mCoin.id,
        source: 'mennica',
        source_id: String(p.id),
        source_url: p.permalink,
        source_payload: payload,
        match_status: 'unmatched',
      });
    }
  }

  const dedup = new Map<string, CatalogCoinRow>();
  for (const c of coins) dedup.set(c.id, c);
  const uniqueCoins = [...dedup.values()];

  for (const c of uniqueCoins) catalogCoinRowSchema.parse(c);
  for (const pr of prices) catalogPriceRowSchema.parse(pr);
  for (const s of sources) coinSourceRowSchema.parse(s);

  await writeJson(path.join(OUT_DIR, 'coins.json'), { generatedAt: scrapedAt, coins: uniqueCoins });
  await writeJson(path.join(OUT_DIR, 'coin-prices.json'), { generatedAt: scrapedAt, prices });
  await writeJson(path.join(OUT_DIR, 'coin-sources.json'), { generatedAt: scrapedAt, sources });

  const report = {
    generatedAt: scrapedAt,
    counts: {
      coins: uniqueCoins.length,
      prices: prices.length,
      sources: sources.length,
      nbp_input: nbp?.coins?.length ?? 0,
      mennica_products: mProducts.length,
    },
    sanity: {
      coinsMissingYear: uniqueCoins.filter((c) => c.year == null).length,
      coinsMissingDenomination: uniqueCoins.filter((c) => c.denomination == null).length,
      coinsMissingImages: uniqueCoins.filter((c) => !c.image_obverse && !c.image_reverse).length,
      mennicaUnmatched: sources.filter((s) => s.source === 'mennica' && s.match_status === 'unmatched').length,
    },
  };
  await writeJson(path.join(OUT_DIR, 'report.json'), report);

  console.info('[catalog:normalize]', JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
