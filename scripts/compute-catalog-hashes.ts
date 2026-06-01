/**
 * Precompute dHash for catalog obverse/reverse images.
 * Output: assets/catalog/coin-image-hashes.json (bundled in the app).
 */
import { config as loadEnv } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { gray9x8ToDHashHex, rgbaToGray9x8 } from '../services/vision/dHash';
import { REPO_ROOT } from './lib/repoRoot';

loadEnv({ path: path.join(REPO_ROOT, '.env') });

const COINS_FILE = path.join(REPO_ROOT, 'data', 'catalog', 'normalized', 'coins.json');
const OUT_FILE = path.join(REPO_ROOT, 'assets', 'catalog', 'coin-image-hashes.json');
const CONCURRENCY = 12;

type CatalogFile = {
  coins: {
    id: string;
    image_obverse: string | null;
    image_reverse: string | null;
  }[];
};

type HashEntry = { coin_id: string; side: 'obverse' | 'reverse'; hash: string };

async function hashFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf)
      .resize(9, 8, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const gray = rgbaToGray9x8(new Uint8Array(data), info.width, info.height);
    return gray9x8ToDHashHex(gray);
  } catch {
    return null;
  }
}

async function mapPool<T, R>(items: T[], fn: (item: T) => Promise<R>, limit: number): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const raw = await fs.readFile(COINS_FILE, 'utf8');
  const catalog = JSON.parse(raw) as CatalogFile;
  const tasks: { coin_id: string; side: 'obverse' | 'reverse'; url: string }[] = [];

  for (const c of catalog.coins) {
    if (c.image_obverse) tasks.push({ coin_id: c.id, side: 'obverse', url: c.image_obverse });
    if (c.image_reverse) tasks.push({ coin_id: c.id, side: 'reverse', url: c.image_reverse });
  }

  console.log(`[catalog:hashes] hashing ${tasks.length} images…`);
  const results = await mapPool(tasks, async (t) => {
    const hash = await hashFromUrl(t.url);
    return { ...t, hash };
  }, CONCURRENCY);

  const entries: HashEntry[] = results
    .filter((r): r is typeof r & { hash: string } => !!r.hash)
    .map((r) => ({ coin_id: r.coin_id, side: r.side, hash: r.hash }));

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    JSON.stringify({ version: '1', generatedAt: new Date().toISOString(), entries }, null, 0),
    'utf8',
  );

  console.log(
    `[catalog:hashes] wrote ${entries.length}/${tasks.length} hashes → ${path.relative(REPO_ROOT, OUT_FILE)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
