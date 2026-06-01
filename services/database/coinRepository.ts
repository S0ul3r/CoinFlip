import type { Coin, CoinPrice } from '@/types/coin.types';
import { getDatabase } from './db';

export function upsertCoins(coins: Coin[]) {
  const db = getDatabase();
  for (const c of coins) {
    db.runSync(
      `INSERT OR REPLACE INTO coins (
        id, owner_user_id, is_custom, name, series, denomination, year, mint, mintage, material, weight_g, diameter_mm,
        quality, description, image_obverse, image_reverse, issue_price, category, source_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.owner_user_id ?? null,
        c.is_custom ? 1 : 0,
        c.name,
        c.series,
        c.denomination,
        c.year,
        c.mint,
        c.mintage,
        c.material,
        c.weight_g,
        c.diameter_mm,
        c.quality,
        c.description,
        c.image_obverse,
        c.image_reverse,
        c.issue_price,
        c.category,
        c.source_url,
        c.created_at,
        c.updated_at,
      ],
    );
  }
}

export function upsertCoin(coin: Coin) {
  upsertCoins([coin]);
}

export function clearCoinPrices() {
  const db = getDatabase();
  db.execSync('DELETE FROM coin_prices');
}

export function upsertCoinPrices(rows: Omit<CoinPrice, 'id'>[]) {
  const db = getDatabase();
  for (const p of rows) {
    db.runSync(
      `INSERT INTO coin_prices (coin_id, price, source, source_url, scraped_at) VALUES (?, ?, ?, ?, ?)`,
      [p.coin_id, p.price, p.source, p.source_url, p.scraped_at],
    );
  }
}

export function setManualCurrentValue(coinId: string, price: number) {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO coin_prices (coin_id, price, source, source_url, scraped_at) VALUES (?, ?, 'manual_current', NULL, ?)`,
    coinId,
    price,
    new Date().toISOString(),
  );
}

export function getCoinById(id: string): Coin | null {
  const db = getDatabase();
  return db.getFirstSync<Coin>('SELECT * FROM coins WHERE id = ?', id);
}

export function searchCoins(params: {
  query?: string;
  year?: number;
  series?: string;
  denomination?: number;
  limit?: number;
  offset?: number;
}): Coin[] {
  const db = getDatabase();
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (params.query?.trim()) {
    conditions.push('(name LIKE ? OR description LIKE ? OR series LIKE ?)');
    const q = `%${params.query.trim()}%`;
    values.push(q, q, q);
  }
  if (params.year != null) {
    conditions.push('year = ?');
    values.push(params.year);
  }
  if (params.series?.trim()) {
    conditions.push('series LIKE ?');
    values.push(`%${params.series.trim()}%`);
  }
  if (params.denomination != null) {
    conditions.push('denomination = ?');
    values.push(params.denomination);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM coins ${where} ORDER BY year DESC, name ASC LIMIT ? OFFSET ?`;
  values.push(limit, offset);
  return db.getAllSync<Coin>(sql, ...values);
}

export function getLatestPriceForCoin(coinId: string): CoinPrice | null {
  const db = getDatabase();
  return db.getFirstSync<CoinPrice>(
    `SELECT * FROM coin_prices WHERE coin_id = ? ORDER BY datetime(scraped_at) DESC LIMIT 1`,
    coinId,
  );
}

function normalizeForMatch(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Metadata-based local catalog match (OCR / hybrid / legacy text). */
export function findBestCatalogMatch(input: {
  name?: string;
  year: number | null;
  denomination?: number | null;
  material?: string | null;
}): Coin | null {
  const db = getDatabase();
  const normalized = normalizeForMatch(input.name ?? '');

  if (!normalized) {
    if (input.year == null && input.denomination == null) return null;
    const rows = searchCoins({
      year: input.year ?? undefined,
      denomination: input.denomination ?? undefined,
      limit: 25,
    });
    if (rows.length === 1) return rows[0]!;
    if (rows.length > 1 && input.year != null && input.denomination != null) {
      const exact = rows.filter(
        (c) => c.year === input.year && Number(c.denomination) === Number(input.denomination),
      );
      if (exact.length === 1) return exact[0]!;
    }
    return rows[0] ?? null;
  }
  const tokens = normalized.split(' ').filter((t) => t.length >= 3);
  const normalizedMaterial = normalizeForMatch(input.material ?? null);

  const candidates = db.getAllSync<Coin>(
    `SELECT * FROM coins WHERE lower(name) LIKE ? OR lower(series) LIKE ? OR lower(description) LIKE ? LIMIT 120`,
    `%${normalized}%`,
    `%${normalized}%`,
    `%${normalized}%`,
  );

  let best: Coin | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const coin of candidates) {
    const nameNorm = normalizeForMatch(coin.name);
    const descNorm = normalizeForMatch(coin.description);
    let score = 0;

    if (nameNorm === normalized) score += 140;
    if (nameNorm.includes(normalized) || normalized.includes(nameNorm)) score += 60;

    if (input.year != null && coin.year != null) {
      if (input.year === coin.year) score += 34;
      else score -= 25;
    }

    if (input.denomination != null && coin.denomination != null) {
      if (Number(input.denomination) === Number(coin.denomination)) score += 26;
      else score -= 12;
    }

    if (normalizedMaterial && coin.material) {
      const coinMaterial = normalizeForMatch(coin.material);
      if (coinMaterial.includes(normalizedMaterial) || normalizedMaterial.includes(coinMaterial)) score += 16;
    }

    for (const token of tokens) {
      if (nameNorm.includes(token)) score += 7;
      else if (descNorm.includes(token)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = coin;
    }
  }

  if (best && bestScore >= 42) return best;

  if (input.year != null) {
    const exact = db.getFirstSync<Coin>(
      `SELECT * FROM coins WHERE lower(name) = ? AND year = ? LIMIT 1`,
      normalized,
      input.year,
    );
    if (exact) return exact;
    const like = db.getAllSync<Coin>(
      `SELECT * FROM coins WHERE year = ? AND (lower(name) LIKE ? OR lower(description) LIKE ?) LIMIT 5`,
      input.year,
      `%${normalized}%`,
      `%${normalized}%`,
    );
    if (like.length === 1) return like[0]!;
    if (like.length > 0) return like[0]!;
  }

  const broad = db.getAllSync<Coin>(
    `SELECT * FROM coins WHERE lower(name) LIKE ? ORDER BY year DESC LIMIT 5`,
    `%${normalized}%`,
  );
  return broad[0] ?? null;
}
