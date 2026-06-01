/**
 * Mennica collector coins — uses WooCommerce Store API (JSON) so no browser is required.
 */
import path from 'node:path';
import { REPO_ROOT } from './lib/repoRoot';
import { catalogRunId } from './lib/runId';
import { writeJson } from './lib/writeJson';

const RAW_DIR = path.join(REPO_ROOT, 'data', 'catalog', 'mennica', 'raw');
const BASE = 'https://inwestycje.mennica.com.pl';

/**
 * WordPress "MONETY" parent category id (produkty-kolekcjonerskie/monety/).
 * Child slugs include monety-nbp-srebrne (206), monety-nbp-zlote (61), monety-srebrne (59), monety-zlote (57), …
 */
const MENNICA_MONETY_PARENT_ID = 49;
/** Legacy minimal set if auto-discovery is disabled */
const DEFAULT_CATEGORIES_FALLBACK = '206,61';

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

type WooProduct = Record<string, unknown>;

async function fetchJson(url: string): Promise<unknown> {
  const timeoutMs = envInt('MENNICA_TIMEOUT_MS', 30_000);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CoinFlip-catalog-scraper/1.0 (+https://github.com)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

type WpTerm = { id: number; count: number; slug: string };

async function fetchMonetyChildCategoryIds(): Promise<number[]> {
  const url = `${BASE}/wp-json/wp/v2/product_cat?parent=${MENNICA_MONETY_PARENT_ID}&per_page=100`;
  const arr = (await fetchJson(url)) as WpTerm[];
  if (!Array.isArray(arr)) return [];
  return arr.filter((c) => c.count > 0).map((c) => c.id);
}

async function fetchCategoryProducts(categoryId: number): Promise<WooProduct[]> {
  const perPage = envInt('MENNICA_PER_PAGE', 100);
  const maxPages = envInt('MENNICA_MAX_PAGES', 50);
  const all: WooProduct[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE}/wp-json/wc/store/v1/products?category=${categoryId}&per_page=${perPage}&page=${page}`;
    const chunk = (await fetchJson(url)) as WooProduct[];
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    console.info(`[scrape-mennica] Category ${categoryId} page ${page}: +${chunk.length} products`);
    if (chunk.length < perPage) break;
  }
  return all;
}

function normalizePermalink(p: string): string {
  return p.replace(/https:\/\/inwestycje\.mennica\.com\.pl\/\.\//g, 'https://inwestycje.mennica.com.pl/');
}

async function main(): Promise<void> {
  const runId = catalogRunId();
  let catIds: number[];
  if (process.env.MENNICA_CATEGORY_IDS?.trim()) {
    catIds = process.env.MENNICA_CATEGORY_IDS.split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  } else if (process.env.MENNICA_NBP_ONLY === '1') {
    catIds = DEFAULT_CATEGORIES_FALLBACK.split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
  } else {
    catIds = await fetchMonetyChildCategoryIds();
    if (!catIds.length) {
      console.warn('[scrape-mennica] Auto category list empty; falling back to NBP-only ids');
      catIds = DEFAULT_CATEGORIES_FALLBACK.split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n));
    }
  }
  console.info(`[scrape-mennica] Categories to scrape (${catIds.length}): ${catIds.join(',')}`);

  const errors: string[] = [];
  const byCategory: Record<string, WooProduct[]> = {};

  for (const id of catIds) {
    try {
      const products = await fetchCategoryProducts(id);
      byCategory[String(id)] = products.map((p) => ({
        ...p,
        permalink: typeof p.permalink === 'string' ? normalizePermalink(p.permalink) : p.permalink,
      }));
    } catch (e) {
      errors.push(`category ${id}: ${(e as Error).message}`);
    }
  }

  const flat = Object.values(byCategory).flat();

  const snapshot = {
    source: 'mennica' as const,
    runId,
    scrapedAt: new Date().toISOString(),
    categories: catIds,
    errors,
    productCount: flat.length,
    productsByCategory: byCategory,
  };

  const latestPath = path.join(RAW_DIR, 'latest.json');
  const versionedPath = path.join(RAW_DIR, `run-${runId}.json`);
  await writeJson(versionedPath, snapshot);
  await writeJson(latestPath, snapshot);

  console.info(`[scrape-mennica] Wrote ${versionedPath}`);
  console.info(`[scrape-mennica] Products: ${flat.length}, categories (${catIds.length}): ${catIds.join(',')}, errors: ${errors.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
