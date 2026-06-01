import { CollectionOwnershipCard } from '@/components/collection/CollectionOwnershipCard';
import { CoinDetail } from '@/components/coins/CoinDetail';
import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as coinRepo from '@/services/database/coinRepository';
import * as collectionRepo from '@/services/database/collectionRepository';
import * as priceSvc from '@/services/pricing/priceService';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function CoinDetailScreen() {
  const { id: rawId, collectionItemId: rawCollectionId } = useLocalSearchParams<{
    id: string;
    collectionItemId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const id = rawId ? decodeURIComponent(rawId) : '';
  const collectionItemId = rawCollectionId ? decodeURIComponent(rawCollectionId) : '';

  const coin = useMemo(() => (id ? coinRepo.getCoinById(id) : null), [id]);
  const collectionItem = useMemo(() => {
    if (!user?.id) return null;
    if (collectionItemId) return collectionRepo.getCollectionItemById(user.id, collectionItemId);
    if (id) return collectionRepo.getCollectionItemByCoinId(user.id, id);
    return null;
  }, [user?.id, collectionItemId, id]);

  const market = coin ? priceSvc.getLocalLatestMarketPrice(coin.id) : null;
  const issue = coin ? priceSvc.getLocalIssuePrice(coin.id) : null;

  if (!coin) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text>Nie znaleziono monety w lokalnej bazie.</Text>
          <Button onPress={() => router.back()}>Wstecz</Button>
        </View>
      </SafeScreen>
    );
  }

  const inCollection = !!collectionItem;

  return (
    <SafeScreen>
      <View style={styles.flex}>
        <CoinDetail
          coin={coin}
          marketPrice={market}
          issuePrice={issue}
          header={
            inCollection && collectionItem ? (
              <CollectionOwnershipCard item={collectionItem} />
            ) : null
          }
        />
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {inCollection && collectionItem ? (
            <Button
              mode="contained"
              icon="pencil"
              onPress={() =>
                router.push(`/edit-collection/${encodeURIComponent(collectionItem.id)}` as Href)
              }>
              Edytuj monetę
            </Button>
          ) : (
            <Button
              mode="contained"
              disabled={!user?.id}
              onPress={() =>
                router.push({
                  pathname: '/add-to-collection',
                  params: { coinId: coin.id },
                })
              }>
              Dodaj do kolekcji
            </Button>
          )}
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
});
