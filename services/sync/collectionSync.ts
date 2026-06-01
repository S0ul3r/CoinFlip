import * as collectionRepo from '@/services/database/collectionRepository';
import * as coinRepo from '@/services/database/coinRepository';
import { supabase } from '@/services/supabase/client';
import type { CollectionItem } from '@/types/coin.types';

function sanitizePhoto(uri: string | null | undefined) {
  if (!uri) return null;
  if (uri.startsWith('file:') || uri.startsWith('content:')) return null;
  return uri;
}

function rowToRemote(r: CollectionItem) {
  return {
    id: r.id,
    user_id: r.user_id,
    coin_id: r.coin_id,
    purchase_price: r.purchase_price,
    current_value: r.current_value,
    purchase_date: r.purchase_date,
    condition: r.condition,
    notes: r.notes,
    my_photo_obverse: sanitizePhoto(r.my_photo_obverse),
    my_photo_reverse: sanitizePhoto(r.my_photo_reverse),
    is_for_sale: r.is_for_sale ?? 0,
    added_at: r.added_at,
    updated_at: r.updated_at,
  };
}

async function pushCustomCoinsForCollection(rows: CollectionItem[]) {
  const customCoins = rows
    .map((r) => coinRepo.getCoinById(r.coin_id))
    .filter((coin) => coin?.is_custom);

  if (!customCoins.length) return;

  const { error } = await supabase.from('coins').upsert(
    customCoins.map((c) => ({
      id: c!.id,
      owner_user_id: c!.owner_user_id,
      is_custom: true,
      name: c!.name,
      series: c!.series,
      denomination: c!.denomination,
      year: c!.year,
      mint: c!.mint,
      mintage: c!.mintage,
      material: c!.material,
      weight_g: c!.weight_g,
      diameter_mm: c!.diameter_mm,
      quality: c!.quality,
      description: c!.description,
      image_obverse: sanitizePhoto(c!.image_obverse),
      image_reverse: sanitizePhoto(c!.image_reverse),
      issue_price: c!.issue_price,
      category: c!.category,
      source_url: c!.source_url,
      created_at: c!.created_at,
      updated_at: c!.updated_at,
    })),
    { onConflict: 'id' },
  );
  if (error) throw error;
}

/** Push local pending rows to Supabase */
export async function pushCollectionToSupabase(userId: string) {
  const pending = collectionRepo.getPendingSyncItems(userId);
  if (!pending.length) return;

  await pushCustomCoinsForCollection(pending);

  const { error } = await supabase.from('my_collection').upsert(pending.map(rowToRemote), {
    onConflict: 'id',
  });
  if (error) throw error;
  collectionRepo.markSynced(pending.map((p) => p.id));
}

/** Pull remote collection into SQLite */
export async function pullCollectionFromSupabase(userId: string) {
  const { data, error } = await supabase
    .from('my_collection')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  if (data?.length) {
    collectionRepo.upsertCollectionFromRemote(data as CollectionItem[]);
  }
}
