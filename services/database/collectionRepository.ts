import type { CollectionItem } from '@/types/coin.types';
import * as Crypto from 'expo-crypto';
import { getDatabase } from './db';

export function getCollectionItemById(
  userId: string,
  id: string,
): (CollectionItem & { coin_name?: string }) | null {
  const db = getDatabase();
  return (
    db.getFirstSync<CollectionItem & { coin_name?: string }>(
      `SELECT m.*, c.name AS coin_name
       FROM my_collection m
       JOIN coins c ON c.id = m.coin_id
       WHERE m.user_id = ? AND m.id = ?`,
      userId,
      id,
    ) ?? null
  );
}

export function getCollectionItemByCoinId(
  userId: string,
  coinId: string,
): (CollectionItem & { coin_name?: string }) | null {
  const db = getDatabase();
  return (
    db.getFirstSync<CollectionItem & { coin_name?: string }>(
      `SELECT m.*, c.name AS coin_name
       FROM my_collection m
       JOIN coins c ON c.id = m.coin_id
       WHERE m.user_id = ? AND m.coin_id = ?
       ORDER BY datetime(m.added_at) DESC
       LIMIT 1`,
      userId,
      coinId,
    ) ?? null
  );
}

export function listCollection(userId: string): (CollectionItem & { coin_name?: string })[] {
  const db = getDatabase();
  return db.getAllSync<CollectionItem & { coin_name?: string }>(
    `SELECT m.*, c.name AS coin_name
     FROM my_collection m
     JOIN coins c ON c.id = m.coin_id
     WHERE m.user_id = ?
     ORDER BY datetime(m.added_at) DESC`,
    userId,
  );
}

export function insertCollectionItem(
  userId: string,
  input: Omit<CollectionItem, 'id' | 'user_id' | 'pending_sync' | 'updated_at'> & {
    id?: string;
  },
): string {
  const db = getDatabase();
  const id = input.id ?? Crypto.randomUUID();
  const now = new Date().toISOString();
  const addedAt = input.added_at ?? now;
  db.runSync(
    `INSERT INTO my_collection (
      id, user_id, coin_id, purchase_price, current_value, purchase_date, condition, notes,
      my_photo_obverse, my_photo_reverse, is_for_sale, added_at, updated_at, pending_sync
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      userId,
      input.coin_id,
      input.purchase_price,
      input.current_value,
      input.purchase_date,
      input.condition,
      input.notes,
      input.my_photo_obverse,
      input.my_photo_reverse,
      input.is_for_sale ?? 0,
      addedAt,
      now,
    ],
  );
  return id;
}

export function updateCollectionItem(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      CollectionItem,
      | 'purchase_price'
      | 'current_value'
      | 'purchase_date'
      | 'condition'
      | 'notes'
      | 'my_photo_obverse'
      | 'my_photo_reverse'
      | 'is_for_sale'
    >
  >,
) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const vals: (string | number | null)[] = [];

  (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => {
    const v = patch[k];
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      vals.push(v as string | number | null);
    }
  });
  if (!fields.length) return;
  fields.push('updated_at = ?');
  fields.push('pending_sync = 1');
  vals.push(now, id, userId);
  db.runSync(
    `UPDATE my_collection SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    ...vals,
  );
}

export function deleteCollectionItem(userId: string, id: string) {
  const db = getDatabase();
  db.runSync('DELETE FROM my_collection WHERE id = ? AND user_id = ?', id, userId);
}

export function deleteAllCollectionForUser(userId: string) {
  const db = getDatabase();
  db.runSync('DELETE FROM my_collection WHERE user_id = ?', userId);
}

export function getPendingSyncItems(userId: string): CollectionItem[] {
  const db = getDatabase();
  return db.getAllSync<CollectionItem>(
    'SELECT * FROM my_collection WHERE user_id = ? AND pending_sync = 1',
    userId,
  );
}

export function markSynced(ids: string[]) {
  const db = getDatabase();
  for (const id of ids) {
    db.runSync('UPDATE my_collection SET pending_sync = 0 WHERE id = ?', id);
  }
}

export function upsertCollectionFromRemote(rows: CollectionItem[]) {
  const db = getDatabase();
  for (const r of rows) {
    db.runSync(
      `INSERT OR REPLACE INTO my_collection (
        id, user_id, coin_id, purchase_price, current_value, purchase_date, condition, notes,
        my_photo_obverse, my_photo_reverse, is_for_sale, added_at, updated_at, pending_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        r.id,
        r.user_id,
        r.coin_id,
        r.purchase_price,
        r.current_value,
        r.purchase_date,
        r.condition,
        r.notes,
        r.my_photo_obverse,
        r.my_photo_reverse,
        r.is_for_sale ?? 0,
        r.added_at,
        r.updated_at,
      ],
    );
  }
}
