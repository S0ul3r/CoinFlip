import { SafeScreen } from '@/components/SafeScreen';
import { CollectionItem } from '@/components/collection/CollectionItem';
import { CollectionStats } from '@/components/collection/CollectionStats';
import { useAppTheme } from '@/contexts/AppThemeContext';
import * as coinRepo from '@/services/database/coinRepository';
import { useAuth } from '@/contexts/AuthContext';
import { useCollectionQuery } from '@/hooks/useCollection';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function CollectionTab() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { data: items = [], isLoading } = useCollectionQuery();
  const uid = user?.id ?? '';

  const { totalPurchase, totalMarket } = useMemo(() => {
    let purchase = 0;
    let market = 0;
    for (const it of items) {
      purchase += it.purchase_price ?? 0;
      const p = coinRepo.getLatestPriceForCoin(it.coin_id);
      const m = it.current_value ?? p?.price ?? coinRepo.getCoinById(it.coin_id)?.issue_price ?? 0;
      market += m;
    }
    return { totalPurchase: purchase, totalMarket: market };
  }, [items]);

  return (
    <SafeScreen>
      <View style={styles.screen}>
        <Text variant="titleLarge" style={[styles.title, { color: colors.text }]}>
          Kolekcja
        </Text>
        <Button
          mode="contained"
          icon="plus"
          style={styles.addButton}
          buttonColor={colors.accent}
          textColor="#FFFFFF"
          onPress={() => router.push('/add-to-collection')}>
          Dodaj monetę ręcznie
        </Button>
        {!uid ? (
          <Text style={[styles.center, { color: colors.textMuted }]}>
            Zaloguj się, aby zobaczyć kolekcję.
          </Text>
        ) : isLoading ? (
          <Text style={[styles.center, { color: colors.textMuted }]}>Ładowanie…</Text>
        ) : (
          <>
            <CollectionStats totalPurchase={totalPurchase} totalMarket={totalMarket} count={items.length} />
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <CollectionItem
                  item={item}
                  marketPrice={coinRepo.getLatestPriceForCoin(item.coin_id)?.price ?? null}
                  onPress={() =>
                    router.push({
                      pathname: '/coin/[id]',
                      params: {
                        id: item.coin_id,
                        collectionItemId: item.id,
                      },
                    })
                  }
                />
              )}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={[styles.center, { color: colors.textMuted }]}>
                  Kolekcja jest pusta. Dodaj pierwszą monetę ręcznie lub ze skanera.
                </Text>
              }
            />
          </>
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 12, paddingHorizontal: 12 },
  title: { marginBottom: 10, paddingHorizontal: 4 },
  addButton: { marginBottom: 12, borderRadius: 18 },
  list: { paddingBottom: 32 },
  center: { textAlign: 'center', marginTop: 24 },
});
