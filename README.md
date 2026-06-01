# CoinFlip (Polish coins)

React Native **Expo SDK 54** app: camera scan → **hybrid local identification** (OCR when available + perceptual image hash vs catalog) → local **SQLite** catalog + **Supabase** auth/sync + collection valuation.

## Prerequisites (Windows, Android-first)

- **Node.js 20 LTS**
- **Android Studio** (emulator) or a physical Android device with **Expo Go** / dev build
- **Supabase** project (run SQL migrations from `supabase/migrations/`)
- Catalog image hashes bundled in the app (`npm run catalog:hashes` after normalize)

You do **not** need macOS/Xcode for Android development. iOS builds can use **EAS Build** later.

## Setup

1. Clone the repo and install:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   copy .env.example .env
   ```

   Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. In Supabase SQL editor (or `supabase db push`), apply migrations in order:
   - `supabase/migrations/20250504000001_init_schema.sql`
   - `supabase/migrations/20250504000002_seed_sample_coins.sql`
   - `supabase/migrations/20250504000003_manual_collection_fields.sql`
   - `supabase/migrations/20250504000004_coin_sources.sql`

4. Build catalog image hashes (once per catalog update):

   ```bash
   npm run catalog:hashes
   ```

5. Deploy Edge Function for price refresh (optional legacy `identify-coin` is no longer used by the app):

   ```bash
   npx supabase functions deploy refresh-prices
   ```

   **Do not** run `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` — the CLI rejects names starting with `SUPABASE_`. On hosted projects, Edge Functions already receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` automatically.

   The “Docker is not running” warning is normal on Windows if Docker Desktop is off; deploy can still succeed.

6. **Development build** (required for on-device OCR — does not work in Expo Go):

   ```bash
   npm run prebuild
   npm run android:dev
   ```

   Or with EAS: `eas build --profile development --platform android`.

7. Start the dev client (after a native build):

   ```bash
   npx expo start --dev-client
   ```

   Press `a` for Android.

## Architecture (MVP)

- **Mobile scan** → resize photo → **dHash** vs precomputed catalog hashes (`coin_image_hashes` in SQLite) + **on-device OCR** (`expo-mlkit-ocr` in development builds; Expo Go = visual-only).
- **Scoring** → combine visual distance + OCR year/nominał + metadata rules → auto-add when confidence ≥ 72%, else **Wynik skanowania** with top candidates.
- **Mobile** → Supabase **Auth** (email/password); catalog sync on login.
- **refresh-prices** → Edge Function with **service role** (placeholder pricing until Allegro/API integration).
- **SQLite** offline cache of `coins`, `coin_prices`, `coin_image_hashes`, `my_collection`.

## Scripts

- `npm run start` — Expo dev server
- `npm run android` — open Android client
- `npm run typecheck` — TypeScript (app only; `scripts/` are run with `tsx`)
- `npm run catalog:hashes` — download catalog images and write `assets/catalog/coin-image-hashes.json`

### Catalog data pipeline (NBP + Mennica → Supabase)

Offline Node scripts write JSON under `data/catalog/` (ignored by git except `.gitkeep` dirs). **Never** put `SUPABASE_SERVICE_ROLE_KEY` in Expo `.env` — use a separate shell env or `.env.catalog` (gitignored) only on a trusted machine.

1. **One-time:** install Playwright’s Chromium for the NBP crawler:

   ```bash
   npx playwright install chromium
   ```

2. **Scrape** (raw snapshots):

   ```bash
   $env:NBP_YEARS = (1995..2026) -join ','
   $env:NBP_MAX_COINS = '5000'
   $env:NBP_MAX_VISITS = '12000'
   $env:NBP_MAX_LISTING_FETCHES = '6000'
   npm run scrape:nbp
   npm run scrape:mennica
   ```

3. **Normalize** (merge / dedupe / match heuristics):

   ```bash
   npm run catalog:normalize
   ```

   Reads `data/catalog/nbp/raw/latest.json` and `data/catalog/mennica/raw/latest.json`, writes `data/catalog/normalized/coins.json`, `coin-prices.json`, `coin-sources.json`, and `report.json`.

4. **Import** into Supabase (service role):

   ```bash
   npm run catalog:import
   ```

### Known extraction limits

- **NBP:** The scraper drives the official catalog at `https://nbp.pl/banknoty-i-monety/monety-okolicznosciowe/katalog/`: it reads every year from `#selected-year`, submits the **Wyszukaj** form (POST) for each year, walks `link rel="next"` pagination (each `/katalog/page/N/` load repeats the year POST so the filter is not lost), collects `/katalog/<slug>/` links, then fetches each coin HTML. It logs year/page progress first, then detail-fetch progress every `NBP_PROGRESS_EVERY` coins, so a full run should not look frozen. A **CookieFirst** banner can block clicks; the script dismisses common “Akceptuj” buttons and uses `force` on the year submit as a fallback. The public site may still show anti-bot interstitials; caches land under `data/catalog/nbp/cache/`. Useful env vars: `NBP_YEARS` (comma list, e.g. `2011,2010` to narrow runs), `NBP_MAX_PAGES_PER_YEAR`, `NBP_MAX_LISTING_FETCHES`, `NBP_MAX_COINS`, `NBP_MAX_VISITS`, `NBP_DELAY_MS`, `NBP_PROGRESS_EVERY`, `NBP_LEGACY_CRAWL=1` (optional old generic crawl after catalog). On Windows PowerShell, set variables with `$env:NBP_YEARS='2011'; npm run scrape:nbp` (not `set`).
- **Mennica:** Uses `GET /wp-json/wc/store/v1/products` (stable JSON) and logs category/page progress. Retail price is **shop** price → imported as `coin_prices` with `source = 'mennica'`, not as authoritative NBP issue price. Useful env vars: `MENNICA_CATEGORY_IDS`, `MENNICA_NBP_ONLY=1`, `MENNICA_PER_PAGE`, `MENNICA_MAX_PAGES`, `MENNICA_TIMEOUT_MS`.
- **Matching:** `catalog:normalize` uses fuzzy name/year/denomination heuristics to attach Mennica prices to NBP coins; unmatched rows stay as `mennica-wc-{id}` coins with `match_status = 'unmatched'` in `coin_sources` for manual review.

## GitHub

Use a private or public repo as you prefer; add `.env` to `.gitignore` (default Expo templates usually ignore it—verify before first commit).
