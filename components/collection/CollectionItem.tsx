import { useAppTheme } from '@/contexts/AppThemeContext';
import * as coinRepo from '@/services/database/coinRepository';
import type { CollectionItem as CollectionRow } from '@/types/coin.types';
import { resolveObverseUri } from '@/utils/coinImages';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { CoinImage } from '../coins/CoinImage';

type Props = {
  item: CollectionRow & { coin_name?: string };
  marketPrice: number | null;
  onPress?: () => void;
};

export function CollectionItem({ item, marketPrice, onPress }: Props) {
  const { colors } = useAppTheme();
  const catalogCoin = useMemo(() => coinRepo.getCoinById(item.coin_id), [item.coin_id]);
  const imageUri = useMemo(
    () => resolveObverseUri(item, catalogCoin),
    [item, catalogCoin],
  );
  const purchase = item.purchase_price ?? 0;
  const market = item.current_value ?? marketPrice ?? 0;
  const delta = market - purchase;

  const body = (
    <View style={styles.row}>
      <CoinImage uri={imageUri} label={item.coin_name} />
      <View style={styles.col}>
        <Text variant="titleMedium" numberOfLines={1}>
          {item.coin_name ?? item.coin_id}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 3 }}>
          Kupno: {purchase} PLN · Teraz: {market ? `~${market} PLN` : '—'}
        </Text>
        <Text
          variant="labelLarge"
          style={[styles.delta, { color: delta >= 0 ? colors.success : colors.error }]}>
          {market ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)} PLN` : '—'}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
  },
  pressed: { opacity: 0.88 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, justifyContent: 'center' },
  delta: { marginTop: 6 },
});
