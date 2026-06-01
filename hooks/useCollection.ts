import { useAuth } from '@/contexts/AuthContext';
import * as collectionRepo from '@/services/database/collectionRepository';
import { useQuery } from '@tanstack/react-query';

export function useCollectionQuery() {
  const { user } = useAuth();
  const uid = user?.id ?? '';
  return useQuery({
    queryKey: ['collection', uid],
    queryFn: () => collectionRepo.listCollection(uid),
    enabled: !!uid,
  });
}
