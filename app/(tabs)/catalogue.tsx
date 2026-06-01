import { SafeScreen } from '@/components/SafeScreen';
import { CoinCard } from '@/components/coins/CoinCard';
import { useAppTheme } from '@/contexts/AppThemeContext';
import * as coinRepo from '@/services/database/coinRepository';
import type { Coin } from '@/types/coin.types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';

export default function CatalogueTab() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [yearText, setYearText] = useState('');

  const yearFilter = useMemo(() => {
    const y = parseInt(yearText, 10);
    return Number.isFinite(y) ? y : undefined;
  }, [yearText]);

  const { data: coins = [], isLoading } = useQuery({
    queryKey: ['coins', query, yearFilter],
    queryFn: () =>
      coinRepo.searchCoins({
        query: query || undefined,
        year: yearFilter,
        limit: 200,
      }),
  });

  const renderItem = ({ item }: { item: Coin }) => (
    <CoinCard coin={item} onPress={() => router.push(`/coin/${encodeURIComponent(item.id)}`)} />
  );

  const searchStyle = [
    styles.search,
    { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  ];

  return (
    <SafeScreen>
      <View style={styles.screen}>
        <Text variant="titleLarge" style={[styles.title, { color: colors.text }]}>
          Katalog
        </Text>
        <Searchbar
          placeholder="Szukaj po nazwie…"
          value={query}
          onChangeText={setQuery}
          style={searchStyle}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.textSubtle}
          iconColor={colors.textMuted}
        />
        <Searchbar
          placeholder="Rok (np. 2024)"
          value={yearText}
          onChangeText={setYearText}
          keyboardType="number-pad"
          style={searchStyle}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.textSubtle}
          iconColor={colors.textMuted}
        />
        {isLoading ? (
          <Text style={[styles.center, { color: colors.textMuted }]}>Ładowanie…</Text>
        ) : (
          <FlatList
            data={coins}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.center, { color: colors.textMuted }]}>
                Brak monet — zsynchronizuj katalog (logowanie).
              </Text>
            }
          />
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 12, paddingHorizontal: 12 },
  title: { marginBottom: 8, paddingHorizontal: 4 },
  search: { marginBottom: 8, borderRadius: 18 },
  list: { paddingBottom: 24 },
  center: { textAlign: 'center', marginTop: 24 },
});
