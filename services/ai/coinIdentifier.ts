import { supabase } from '@/services/supabase/client';
import type { CoinIdentificationResult } from '@/types/coin.types';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

async function formatFunctionsInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const ctx = error.context as Response | undefined;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.clone().text();
        const status = ctx.status;
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          /* not JSON */
        }
        const hint =
          (typeof parsed?.error === 'string' && parsed.error) ||
          (typeof parsed?.message === 'string' && parsed.message) ||
          (typeof parsed?.detail === 'string' && parsed.detail) ||
          (raw.length > 400 ? `${raw.slice(0, 400)}…` : raw);
        return `identify-coin HTTP ${status}: ${hint}`;
      } catch {
        /* fall through */
      }
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message ?? 'identify-coin failed');
  }
  return 'identify-coin failed';
}

export async function identifyCoinFromImageUri(
  imageUri: string,
): Promise<CoinIdentificationResult> {
  const base64 = await readAsStringAsync(imageUri, {
    encoding: EncodingType.Base64,
  });

  const mediaType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const { data, error } = await supabase.functions.invoke<{ result: CoinIdentificationResult }>(
    'identify-coin',
    {
      body: { image_base64: base64, media_type: mediaType },
    },
  );

  if (error) throw new Error(await formatFunctionsInvokeError(error));
  if (!data?.result) throw new Error('Empty identification response');
  return data.result;
}
