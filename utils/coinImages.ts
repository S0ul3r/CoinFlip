import type { Coin } from '@/types/coin.types';
import type { CollectionItem } from '@/types/coin.types';

/** User photo first, then catalog reference image. */
export function resolveObverseUri(
  item: Pick<CollectionItem, 'my_photo_obverse' | 'coin_id'>,
  coin?: Pick<Coin, 'image_obverse' | 'image_reverse'> | null,
): string | null {
  return item.my_photo_obverse ?? coin?.image_obverse ?? null;
}

export function resolveReverseUri(
  item: Pick<CollectionItem, 'my_photo_reverse' | 'coin_id'>,
  coin?: Pick<Coin, 'image_obverse' | 'image_reverse'> | null,
): string | null {
  return item.my_photo_reverse ?? coin?.image_reverse ?? null;
}
