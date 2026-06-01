/** SQLite DDL — mirrors Supabase catalog + local sync flags */
export const SQLITE_SCHEMA_VERSION = 3;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coins (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  is_custom INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  series TEXT,
  denomination REAL,
  year INTEGER,
  mint TEXT,
  mintage INTEGER,
  material TEXT,
  weight_g REAL,
  diameter_mm REAL,
  quality TEXT,
  description TEXT,
  image_obverse TEXT,
  image_reverse TEXT,
  issue_price REAL,
  category TEXT,
  source_url TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS coin_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id TEXT NOT NULL REFERENCES coins(id),
  price REAL NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS my_collection (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  coin_id TEXT NOT NULL REFERENCES coins(id),
  purchase_price REAL,
  current_value REAL,
  purchase_date TEXT,
  condition TEXT,
  notes TEXT,
  my_photo_obverse TEXT,
  my_photo_reverse TEXT,
  is_for_sale INTEGER DEFAULT 0,
  added_at TEXT,
  updated_at TEXT,
  pending_sync INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_coins_year ON coins(year);
CREATE INDEX IF NOT EXISTS idx_coins_name ON coins(name);
CREATE INDEX IF NOT EXISTS idx_collection_coin ON my_collection(coin_id);
CREATE INDEX IF NOT EXISTS idx_prices_coin ON coin_prices(coin_id);

CREATE TABLE IF NOT EXISTS coin_image_hashes (
  coin_id TEXT NOT NULL REFERENCES coins(id),
  side TEXT NOT NULL CHECK (side IN ('obverse', 'reverse')),
  hash TEXT NOT NULL,
  PRIMARY KEY (coin_id, side)
);

CREATE INDEX IF NOT EXISTS idx_coin_hashes_hash ON coin_image_hashes(hash);
`;
