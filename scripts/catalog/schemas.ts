import { z } from 'zod';

/** Row shape for `public.coins` upsert */
export const catalogCoinRowSchema = z.object({
  id: z.string().min(1),
  is_custom: z.literal(false).optional(),
  name: z.string().min(1),
  series: z.string().nullable(),
  denomination: z.number().nullable(),
  year: z.number().int().nullable(),
  mint: z.string().nullable(),
  mintage: z.number().int().nullable(),
  material: z.string().nullable(),
  weight_g: z.number().nullable(),
  diameter_mm: z.number().nullable(),
  quality: z.string().nullable(),
  description: z.string().nullable(),
  image_obverse: z.string().nullable(),
  image_reverse: z.string().nullable(),
  issue_price: z.number().nullable(),
  category: z.string().nullable(),
  source_url: z.string().nullable(),
});

export type CatalogCoinRow = z.infer<typeof catalogCoinRowSchema>;

export const catalogPriceRowSchema = z.object({
  coin_id: z.string().min(1),
  price: z.number(),
  source: z.string().min(1),
  source_url: z.string().nullable(),
  scraped_at: z.string(),
});

export type CatalogPriceRow = z.infer<typeof catalogPriceRowSchema>;

export const coinSourceRowSchema = z.object({
  coin_id: z.string().nullable(),
  source: z.string().min(1),
  source_id: z.string().nullable(),
  source_url: z.string().nullable(),
  source_payload: z.record(z.string(), z.any()),
  match_status: z.enum(['matched', 'unmatched', 'unknown']),
});

export type CoinSourceRow = z.infer<typeof coinSourceRowSchema>;
