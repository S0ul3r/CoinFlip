import * as SQLite from 'expo-sqlite';
import { ensureBundledCatalogHashesLoaded } from './coinHashRepository';
import { CREATE_TABLES_SQL, SQLITE_SCHEMA_VERSION } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('coinflip.db');
    dbInstance.execSync(CREATE_TABLES_SQL);
    const row = dbInstance.getFirstSync<{ value: string } | null>(
      "SELECT value FROM meta WHERE key = 'schema_version'",
    );
    const current = row?.value ? Number(row.value) : 0;
    if (current < SQLITE_SCHEMA_VERSION) {
      if (current < 2) {
        migrateToV2(dbInstance);
      }
      if (current < 3) {
        migrateToV3(dbInstance);
      }
      dbInstance.execSync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '${SQLITE_SCHEMA_VERSION}')`,
      );
    }
    ensureBundledCatalogHashesLoaded();
  }
  return dbInstance;
}

function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, column: string, ddl: string) {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function migrateToV2(db: SQLite.SQLiteDatabase) {
  addColumnIfMissing(db, 'coins', 'owner_user_id', 'owner_user_id TEXT');
  addColumnIfMissing(db, 'coins', 'is_custom', 'is_custom INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'my_collection', 'current_value', 'current_value REAL');
}

function migrateToV3(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS coin_image_hashes (
      coin_id TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('obverse', 'reverse')),
      hash TEXT NOT NULL,
      PRIMARY KEY (coin_id, side)
    );
    CREATE INDEX IF NOT EXISTS idx_coin_hashes_hash ON coin_image_hashes(hash);
  `);
}

export function resetDatabaseForTests() {
  dbInstance = null;
}
