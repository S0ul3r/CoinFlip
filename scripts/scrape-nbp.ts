/**
 * NBP commemorative catalog scraper — Playwright fetch + HTML cache + Cheerio extraction.
 * Discovers coin URLs by iterating the catalog year filter (POST) and paginated listing URLs
 * (/katalog/page/N/), then fetches each coin detail page. Anti-bot / cookie banners may still block.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type { Page } from 'playwright';
import { chromium } from 'playwright';
import { REPO_ROOT } from './lib/repoRoot';
import { catalogRunId } from './lib/runId';
import { ensureDir, writeJson } from './lib/writeJson';

const RAW_DIR = path.join(REPO_ROOT, 'data', 'catalog', 'nbp', 'raw');
const CACHE_DIR = path.join(REPO_ROOT, 'data', 'catalog', 'nbp', 'cache');

const CATALOG_BASE = 'https://nbp.pl/banknoty-i-monety/monety-okolicznosciowe/katalog/';

/** Legacy crawl seeds (comma-separated). Used only when NBP_LEGACY_CRAWL=1. */
const DEFAULT_START = [
  CATALOG_BASE,
  'https://nbp.pl/banknoty-i-monety/monety-okolicznosciowe/',
  'https://nbp.pl/banknoty-i-monety/',
].join(',');

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string): boolean {
  const v = (process.env[name] ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cacheFileFor(url: string): string {
  const h = createHash('sha256').update(url).digest('hex').slice(0, 24);
  return path.join(CACHE_DIR, `${h}.html`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extractYear(text: string): number | null {
  const m = text.match(/\b(19|20)\d{2}\b/g);
  if (!m?.length) return null;
  for (const y of m) {
    const n = Number.parseInt(y, 10);
    if (n >= 1960 && n <= 2035) return n;
  }
  return null;
}

function extractDenomination(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*zł/i);
  if (!m) return null;
  return Number.parseFloat(m[1].replace(',', '.'));
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function parseDecimalComma(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseIntegerLoose(s: string): number | null {
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function parseWeightGrams(s: string): number | null {
  if (!/g\b/i.test(s)) return null;
  return parseDecimalComma(s);
}

function parseDiameterMm(s: string): number | null {
  const t = s.toLowerCase();
  if (t.includes('x')) return null;
  if (/ø|fi|mm|średnic|srednic/i.test(t)) return parseDecimalComma(s);
  return null;
}

type ParsedVariant = {
  title: string;
  description: string | null;
  year: number | null;
  denomination: number | null;
  material: string | null;
  mintage: number | null;
  weight_g: number | null;
  diameter_mm: number | null;
  quality: string | null;
  issue_date: string | null;
  image_obverse: string | null;
  image_reverse: string | null;
  text_excerpt: string;
  variant_label: string | null;
  source_specs: Record<string, string>;
};

function isLikelyCoinImage(url: string): boolean {
  return (
    /\.(png|jpg|jpeg|webp)(\?|$)/i.test(url) &&
    !/\/nbp-og-image/i.test(url) &&
    !/favicon|logo/i.test(url)
  );
}

/** Coin detail URLs from a catalog listing (excludes /katalog/page/N/). */
function extractCatalogCoinUrls(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $('a[href*="/monety-okolicznosciowe/katalog/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('javascript:')) return;
    if (/\.pdf(\?|$)/i.test(href)) return;
    let abs: URL;
    try {
      abs = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (!abs.hostname.endsWith('nbp.pl')) return;
    const parts = abs.pathname.split('/').filter(Boolean);
    const ki = parts.findIndex((p) => p.toLowerCase() === 'katalog');
    if (ki < 0) return;
    const after = parts.slice(ki + 1);
    if (after.length === 0) return;
    if (after[0].toLowerCase() === 'page') return;
    abs.hash = '';
    out.add(abs.href);
  });
  return [...out];
}

function parseRelNextHref(html: string, pageUrl: string): string | null {
  const m = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
  if (!m?.[1]) return null;
  try {
    return new URL(m[1], pageUrl).href;
  } catch {
    return null;
  }
}

function parseYearOptions(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const years: string[] = [];
  $('#selected-year option').each((_, el) => {
    const v = $(el).attr('value')?.trim();
    if (v && /^\d{4}$/.test(v)) years.push(v);
  });
  if (years.length) return [...new Set(years)].sort((a, b) => Number(b) - Number(a));
  const m = pageUrl.match(/[?&]selected-year=(\d{4})/);
  return m?.[1] ? [m[1]] : [];
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const locators = [
    page.locator('[data-cookiefirst-button]').filter({ hasText: /akceptuj|wszystkie|accept all/i }).first(),
    page.getByRole('button', { name: /akceptuj|wszystkie|accept all/i }).first(),
  ];
  for (const loc of locators) {
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ timeout: 5000 }).catch(() => {});
      await sleep(600);
      return;
    }
  }
}

/**
 * Load a catalog listing URL, apply year via POST (Wyszukaj), return final HTML.
 * Pagination must use /katalog/page/N/ then POST again — a bare GET loses the year filter.
 */
async function fetchCatalogListingForYear(
  page: Page,
  listingUrl: string,
  year: string,
  errors: string[],
): Promise<string> {
  try {
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(1200);
    await dismissCookieBanner(page);
    await page.waitForSelector('#selected-year', { timeout: 25_000 });
    await page.selectOption('#selected-year', year);
    await page.locator('form[name="post_from_date"] button[type="submit"]').click({ force: true });
    await sleep(3200);
    return await page.content();
  } catch (e) {
    errors.push(`${listingUrl} [year ${year}]: ${(e as Error).message}`);
    return '';
  }
}

function extractNbpLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
    if (/\.pdf(\?|$)/i.test(href)) return;
    let abs: URL;
    try {
      abs = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (!abs.hostname.endsWith('nbp.pl')) return;
    const p = abs.pathname.toLowerCase();
    if (!p.includes('/banknoty-i-monety/')) return;
    abs.hash = '';
    const s = abs.href;
    if (s === pageUrl.split('#')[0]) return;
    out.add(s);
  });
  return [...out].filter((u) => {
    try {
      const { pathname } = new URL(u);
      const segments = pathname.split('/').filter(Boolean);
      return segments.length >= 3;
    } catch {
      return false;
    }
  });
}

function parseCoinFromHtml(html: string, url: string): ParsedVariant[] {
  const $ = cheerio.load(html);
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const h1 = $('h1').first().text().trim();
  const pageTitle = ogTitle || h1 || '';
  const bodyText = cleanText($('main, article, .content, #content').first().text()).slice(0, 8000);

  const descParas = $('article .col-12 p, main .col-12 p')
    .toArray()
    .map((el) => cleanText($(el).text()))
    .filter((t) => t.length > 0)
    .filter((t) => !/^strona główna\s*\/?/i.test(t))
    .filter((t) => !/katalog monet/i.test(t));
  const cleanDescription = descParas.length ? descParas.join('\n\n').slice(0, 4000) : null;

  const imgs: string[] = [];
  $('article img[src], main img[src]').each((_, el) => {
    const src = $(el).attr('src');
    try {
      const abs = new URL(src!, url).href;
      if (isLikelyCoinImage(abs)) imgs.push(abs);
    } catch {
      /* skip */
    }
  });
  $('meta[property="og:image"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c?.startsWith('http') && isLikelyCoinImage(c)) imgs.push(c);
  });
  const uniq = [...new Set(imgs)];
  const obvByLabel = imgs.find((u) => /awers/i.test(u)) ?? null;
  const revByLabel = imgs.find((u) => /rewers/i.test(u)) ?? null;

  const pdfLinks: string[] = [];
  $('a[href$=".pdf"], a[href*=".pdf"]').each((_, el) => {
    const h = $(el).attr('href');
    if (!h) return;
    try {
      pdfLinks.push(new URL(h, url).href);
    } catch {
      /* skip */
    }
  });

  const baseBlob = `${pageTitle}\n${cleanDescription ?? ''}\n${bodyText}`;
  const baseYear = extractYear(baseBlob);

  const variants: ParsedVariant[] = [];
  $('.card-body').each((_, card) => {
    const cardNode = $(card);
    const specs: Record<string, string> = {};
    cardNode.find('.card-body__info .info-col').each((__, info) => {
      const label = cleanText($(info).find('p').first().text()).toLowerCase();
      const value = cleanText($(info).find('span').first().text());
      if (label && value) specs[label] = value;
    });
    if (!Object.keys(specs).length) return;

    const variantTitle = cleanText(cardNode.find('h2, h3, h4, .card-title').first().text()) || pageTitle;
    const denomFromSpec = extractDenomination(specs['nominał'] ?? specs['nominal'] ?? '');
    const denom = denomFromSpec ?? extractDenomination(`${variantTitle}\n${cleanDescription ?? ''}\n${bodyText}`);
    const year = extractYear(`${variantTitle}\n${cleanDescription ?? ''}`) ?? baseYear;
    const material = specs['próba'] ?? specs['proba'] ?? null;
    const quality = specs['stempel'] ?? null;
    const mintage = parseIntegerLoose(specs['nakład'] ?? specs['naklad'] ?? '');
    const weightG = parseWeightGrams(specs['masa'] ?? '');
    const diameterMm = parseDiameterMm(specs['wymiary'] ?? '');
    const issueDate = specs['data emisji'] ?? null;

    variants.push({
      title: variantTitle || pageTitle,
      description: cleanDescription,
      year,
      denomination: denom,
      material,
      mintage,
      weight_g: weightG,
      diameter_mm: diameterMm,
      quality,
      issue_date: issueDate,
      image_obverse: obvByLabel ?? uniq[1] ?? uniq[0] ?? null,
      image_reverse: revByLabel ?? uniq[0] ?? uniq[1] ?? null,
      text_excerpt: bodyText.slice(0, 1200),
      variant_label: variantTitle || null,
      source_specs: specs,
    });
  });

  if (!variants.length) {
    variants.push({
      title: pageTitle,
      description: cleanDescription ?? (bodyText.slice(0, 2000) || null),
      year: baseYear,
      denomination: extractDenomination(baseBlob),
      material: null,
      mintage: null,
      weight_g: null,
      diameter_mm: null,
      quality: null,
      issue_date: null,
      image_obverse: obvByLabel ?? uniq[1] ?? uniq[0] ?? null,
      image_reverse: revByLabel ?? uniq[0] ?? uniq[1] ?? null,
      text_excerpt: bodyText.slice(0, 1200),
      variant_label: null,
      source_specs: {},
    });
  }

  return variants.map((v, idx) => ({
    ...v,
    variant_index: idx,
    url,
    pdf_links: [...new Set(pdfLinks)].slice(0, 8),
  }));
}

function stableCoinId(extracted: Record<string, unknown>): string {
  const title = String(extracted.title ?? 'coin');
  const year = extracted.year != null ? String(extracted.year) : 'na';
  const denom = extracted.denomination != null ? String(extracted.denomination) : 'na';
  const material = extracted.material != null ? String(extracted.material) : 'na';
  const variantIndex = extracted.variant_index != null ? String(extracted.variant_index) : '0';
  return `nbp-${year}-${slugify(title)}-${slugify(denom)}-${slugify(material)}-${variantIndex}`.replace(/-+/g, '-');
}

function listingUrlForPage(pageNum: number): string {
  if (pageNum <= 1) return CATALOG_BASE;
  return new URL(`page/${pageNum}/`, CATALOG_BASE).href;
}

async function discoverCatalogCoinUrls(
  page: Page,
  years: string[],
  maxPagesPerYear: number,
  listingBudget: { left: number },
  delayMs: number,
  errors: string[],
  canContinue: () => boolean,
  onListingFetch: () => void,
): Promise<string[]> {
  const all = new Set<string>();

  await page.goto(CATALOG_BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(1200);
  await dismissCookieBanner(page);
  const bootstrapHtml = await page.content();
  const parsedYears = parseYearOptions(bootstrapHtml, page.url());
  const ys = years.length ? years : parsedYears;
  if (!ys.length) {
    errors.push('Could not read #selected-year options; set NBP_YEARS=1995,1996,...');
    return [];
  }

  console.info(`[scrape-nbp] Catalog years: ${ys.join(', ')}`);

  for (const year of ys) {
    const yearSeen = new Set<string>();
    let pageNum = 1;
    let pagesVisitedForYear = 0;
    let repeatedPages = 0;
    console.info(`[scrape-nbp] Discovering year ${year}`);
    while (pageNum <= maxPagesPerYear) {
      if (!canContinue()) {
        errors.push('Stopped catalog discovery: NBP_MAX_VISITS reached during listing passes');
        return [...all];
      }
      if (listingBudget.left <= 0) {
        errors.push('Stopped catalog discovery: NBP_MAX_LISTING_FETCHES exhausted');
        return [...all];
      }
      listingBudget.left -= 1;
      const listingUrl = listingUrlForPage(pageNum);
      const html = await fetchCatalogListingForYear(page, listingUrl, year, errors);
      onListingFetch();
      if (!html) break;

      pagesVisitedForYear += 1;
      const batch = extractCatalogCoinUrls(html, page.url());
      let yearNew = 0;
      for (const u of batch) {
        if (!yearSeen.has(u)) yearNew += 1;
        yearSeen.add(u);
        all.add(u);
      }
      console.info(
        `[scrape-nbp] Year ${year} page ${pageNum}: links ${batch.length}, new-for-year ${yearNew}, total ${all.size}`,
      );

      if (batch.length === 0) break;
      if (yearNew === 0) {
        repeatedPages += 1;
        if (repeatedPages >= 2) break;
      } else {
        repeatedPages = 0;
      }

      const relNext = parseRelNextHref(html, page.url());
      if (!relNext) break;

      let nextPage = pageNum + 1;
      try {
        const next = new URL(relNext);
        const m = next.pathname.match(/\/page\/(\d+)\/?$/i);
        if (m) nextPage = Number.parseInt(m[1], 10);
      } catch {
        /* keep nextPage = pageNum + 1 */
      }
      if (!Number.isFinite(nextPage) || nextPage <= pageNum) break;
      pageNum = nextPage;
      await sleep(delayMs);
    }
    console.info(`[scrape-nbp] Year ${year} done: ${yearSeen.size} URLs from ${pagesVisitedForYear} listing pages`);
    await sleep(delayMs);
  }

  return [...all];
}

async function main(): Promise<void> {
  const runId = catalogRunId();
  const startUrls = (process.env.NBP_START_URLS ?? DEFAULT_START)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const maxCoins = envInt('NBP_MAX_COINS', 800);
  const maxVisits = envInt('NBP_MAX_VISITS', 2500);
  const maxQueue = envInt('NBP_MAX_QUEUE', 8000);
  const maxPagesPerYear = envInt('NBP_MAX_PAGES_PER_YEAR', 60);
  const maxListingFetches = envInt('NBP_MAX_LISTING_FETCHES', 2200);
  const delayMs = envInt('NBP_DELAY_MS', 1200);
  const progressEvery = envInt('NBP_PROGRESS_EVERY', 25);
  const legacyCrawl = envBool('NBP_LEGACY_CRAWL');

  const yearsFromEnv = (process.env.NBP_YEARS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{4}$/.test(s));

  await ensureDir(CACHE_DIR);
  const errors: string[] = [];
  const pageCache: { url: string; cacheFile: string }[] = [];
  const coinPages: { url: string; cacheFile: string; extracted: Record<string, unknown> }[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'pl-PL',
  });

  let visits = 0;
  const listingBudget = { left: maxListingFetches };

  try {
    const catalogPage = await context.newPage();
    const catalogUrls = await discoverCatalogCoinUrls(
      catalogPage,
      yearsFromEnv,
      maxPagesPerYear,
      listingBudget,
      delayMs,
      errors,
      () => visits < maxVisits,
      () => {
        visits += 1;
      },
    );
    await catalogPage.close();

    const detailQueue = [...new Set(catalogUrls)];
    console.info(`[scrape-nbp] Catalog detail URLs discovered: ${detailQueue.length}`);
    const visited = new Set<string>();

    const visitAndCache = async (url: string): Promise<string | null> => {
      if (visits >= maxVisits) return null;
      visits += 1;
      const p = await context.newPage();
      let html: string;
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await sleep(2200);
        html = await p.content();
      } catch (e) {
        errors.push(`${url}: ${(e as Error).message}`);
        await p.close();
        return null;
      }
      await p.close();
      const cf = cacheFileFor(url);
      await fs.writeFile(cf, html, 'utf8');
      pageCache.push({ url, cacheFile: path.relative(REPO_ROOT, cf) });
      await sleep(delayMs);
      return html;
    };

    for (const url of detailQueue) {
      if (coinPages.length >= maxCoins || visits >= maxVisits) break;
      if (visited.has(url)) continue;
      visited.add(url);
      if (coinPages.length === 0 || coinPages.length % progressEvery === 0) {
        console.info(`[scrape-nbp] Fetching details ${coinPages.length + 1}/${Math.min(detailQueue.length, maxCoins)}: ${url}`);
      }

      const html = await visitAndCache(url);
      if (!html) continue;

      const lower = html.toLowerCase();
      if (lower.includes('pardon our interruption') || lower.includes('please stand by')) {
        errors.push(`${url}: possible bot interstitial in HTML`);
      }

      try {
        const { pathname } = new URL(url);
        const isCatalogIndex = /monety-okolicznosciowe\/katalog\/?$/i.test(pathname);
        if (!isCatalogIndex) {
          const extractedVariants = parseCoinFromHtml(html, url);
          for (const extracted of extractedVariants) {
            if (coinPages.length >= maxCoins) break;
            if ((extracted.title as string)?.length >= 6) {
              const withId: Record<string, unknown> = { ...extracted };
              withId.scrape_id = stableCoinId(withId);
              coinPages.push({ url, cacheFile: path.relative(REPO_ROOT, cacheFileFor(url)), extracted: withId });
            }
          }
        }
      } catch {
        /* skip */
      }
    }

    if (legacyCrawl && coinPages.length < maxCoins && visits < maxVisits) {
      const queue: string[] = [...startUrls];
      while (queue.length && visits < maxVisits && coinPages.length < maxCoins) {
        const url = queue.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);

        const html = await visitAndCache(url);
        if (!html) continue;

        const lower = html.toLowerCase();
        if (lower.includes('pardon our interruption') || lower.includes('please stand by')) {
          errors.push(`${url}: possible bot interstitial in HTML`);
        }

        for (const link of extractNbpLinks(html, url)) {
          if (!visited.has(link) && queue.length < maxQueue) {
            queue.push(link);
          }
        }

        try {
          const { pathname } = new URL(url);
          const depth = pathname.split('/').filter(Boolean).length;
          const isCatalogIndex = /monety-okolicznosciowe\/katalog\/?$/i.test(pathname);
          if (!isCatalogIndex && (depth >= 4 || /moneta|emisji|okolicznosciow/i.test(pathname))) {
            const extractedVariants = parseCoinFromHtml(html, url);
            for (const extracted of extractedVariants) {
              if (coinPages.length >= maxCoins) break;
              if ((extracted.title as string)?.length >= 6) {
                const withId: Record<string, unknown> = { ...extracted };
                withId.scrape_id = stableCoinId(withId);
                const cf = cacheFileFor(url);
                coinPages.push({ url, cacheFile: path.relative(REPO_ROOT, cf), extracted: withId });
              }
            }
          }
        } catch {
          /* skip */
        }
      }
    }
  } finally {
    await browser.close();
  }

  const snapshot = {
    source: 'nbp' as const,
    runId,
    scrapedAt: new Date().toISOString(),
    errors,
    pageCache,
    coins: coinPages.map((c) => ({
      id: c.extracted.scrape_id,
      source_url: c.url,
      cacheFile: c.cacheFile,
      raw: c.extracted,
    })),
  };

  const latestPath = path.join(RAW_DIR, 'latest.json');
  const versionedPath = path.join(RAW_DIR, `run-${runId}.json`);
  await writeJson(versionedPath, snapshot);
  await writeJson(latestPath, snapshot);

  console.info(`[scrape-nbp] Wrote ${versionedPath}`);
  console.info(
    `[scrape-nbp] Coins extracted: ${snapshot.coins.length}, detail HTML caches: ${snapshot.pageCache.length}, errors: ${errors.length}`,
  );
  if (errors.length) console.warn('[scrape-nbp] First errors:', errors.slice(0, 8));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
