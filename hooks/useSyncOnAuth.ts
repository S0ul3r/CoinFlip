import { useAuth } from '@/contexts/AuthContext';
import { getDatabase } from '@/services/database/db';
import { pullCollectionFromSupabase, pushCollectionToSupabase } from '@/services/sync/collectionSync';
import { syncCatalogFromSupabase } from '@/services/sync/catalogSync';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/** After login: init SQLite, pull catalog + collection, push pending local rows */
export function useSyncOnAuth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        getDatabase();
        await syncCatalogFromSupabase();
        if (cancelled) return;
        await pullCollectionFromSupabase(user.id);
        if (cancelled) return;
        await pushCollectionToSupabase(user.id);
        if (!cancelled) {
          await queryClient.invalidateQueries({ queryKey: ['coins'] });
          await queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
        }
      } catch (e) {
        console.warn('[CoinFlip] sync failed', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, queryClient]);
}
