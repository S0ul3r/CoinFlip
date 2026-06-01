import * as collectionRepo from '@/services/database/collectionRepository';
import { supabase } from '@/services/supabase/client';
import Constants from 'expo-constants';

function getSupabaseAuthConfig(): { url: string; anonKey: string } | null {
  const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra?.supabaseUrl ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey ?? '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

async function deleteAuthUserViaApi(accessToken: string): Promise<Error | null> {
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return new Error('Brak konfiguracji Supabase');

  const res = await fetch(`${cfg.url}/auth/v1/user`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: cfg.anonKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return new Error(body || `Usunięcie konta nie powiodło się (${res.status})`);
  }
  return null;
}

/**
 * Deletes user collection in cloud, local SQLite rows, custom coins, then auth user.
 * Required for App Store 5.1.1(v) and Google Play account deletion policy.
 */
export async function deleteUserAccount(userId: string): Promise<{ error: Error | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: new Error('Brak aktywnej sesji — zaloguj się ponownie') };

  const { error: collectionErr } = await supabase.from('my_collection').delete().eq('user_id', userId);
  if (collectionErr) return { error: collectionErr as Error };

  const { error: coinsErr } = await supabase
    .from('coins')
    .delete()
    .eq('owner_user_id', userId)
    .eq('is_custom', true);
  if (coinsErr) return { error: coinsErr as Error };

  collectionRepo.deleteAllCollectionForUser(userId);

  const authErr = await deleteAuthUserViaApi(token);
  if (authErr) return { error: authErr };

  await supabase.auth.signOut();
  return { error: null };
}
