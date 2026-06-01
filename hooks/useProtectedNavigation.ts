import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isSupabaseConfigured) return;

    const seg0 = segments[0];

    if (!session) {
      if (seg0 && seg0 !== 'login') {
        router.replace('/login');
      }
    } else if (seg0 === 'login') {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);
}
