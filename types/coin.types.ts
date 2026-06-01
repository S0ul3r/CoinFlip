/** Catalog coin (NBP / Mennica / merged) */
export interface Coin {
  id: string;
  owner_user_id?: string | null;
  is_custom?: number | boolean | null;
  name: string;
  series: string | null;
  denomination: number | null;
  year: number | null;
  mint: string | null;
  mintage: number | null;
  material: string | null;
  weight_g: number | null;
  diameter_mm: number | null;
  quality: string | null;
  description: string | null;
  image_obverse: string | null;
  image_reverse: string | null;
  issue_price: number | null;
  category: string | null;
  source_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CoinPrice {
  id: number;
  coin_id: string;
  price: number;
  source: string;
  source_url: string | null;
  scraped_at: string;
}

/** User-owned instance in collection */
export interface CollectionItem {
  id: string;
  user_id: string;
  coin_id: string;
  purchase_price: number | null;
  current_value: number | null;
  purchase_date: string | null;
  condition: string | null;
  notes: string | null;
  my_photo_obverse: string | null;
  my_photo_reverse: string | null;
  is_for_sale: number;
  added_at: string | null;
  updated_at: string | null;
  /** Local-only: pending sync to Supabase */
  pending_sync?: number;
}

export interface IdentificationCandidate {
  coinId: string;
  score: number;
  visualDistance: number;
}

/** Scan identification result (hybrid vision / legacy AI shape) */
export interface CoinIdentificationResult {
  name: string;
  year: number | null;
  denomination: number | null;
  denomination_currency: string;
  series: string | null;
  material: string | null;
  mint: string | null;
  condition_estimate: string | null;
  confidence: number;
  description: string | null;
  is_commemorative: boolean;
  notes: string | null;
}

export interface ScanPayload {
  imageUri: string;
  identification: CoinIdentificationResult;
  matchedCoinId: string | null;
  candidates?: IdentificationCandidate[];
}
