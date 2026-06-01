import { CoinImage } from '@/components/coins/CoinImage';
import { useAppTheme } from '@/contexts/AppThemeContext';
import * as coinRepo from '@/services/database/coinRepository';
import type { CollectionItem } from '@/types/coin.types';
import { resolveObverseUri, resolveReverseUri } from '@/utils/coinImages';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  item: CollectionItem & { coin_name?: string };
};

export function CollectionOwnershipCard({ item }: Props) {
  const { colors } = useAppTheme();
  const catalogCoin = useMemo(() => coinRepo.getCoinById(item.coin_id), [item.coin_id]);
  const obverseUri = useMemo(() => resolveObverseUri(item, catalogCoin), [item, catalogCoin]);
  const reverseUri = useMemo(() => resolveReverseUri(item, catalogCoin), [item, catalogCoin]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
      <Text variant="titleMedium" style={{ color: colors.gold }}>
        Twoja moneta w kolekcji
      </Text>
      <Row label="Cena zakupu" value={formatPln(item.purchase_price)} colors={colors} />
      <Row label="Aktualna wartość" value={formatPln(item.current_value)} colors={colors} />
      <Row label="Data zakupu" value={item.purchase_date ?? '—'} colors={colors} />
      {item.notes ? (
        <View style={styles.notes}>
          <Text variant="labelMedium" style={{ color: colors.textMuted }}>
            Notatki
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.text }}>
            {item.notes}
          </Text>
        </View>
      ) : null}
      {(obverseUri || reverseUri) && (
        <View style={styles.photos}>
          {obverseUri ? (
            <View style={styles.photoWrap}>
              <Text variant="labelSmall" style={{ color: colors.textMuted }}>
                Awers
              </Text>
              <CoinImage uri={obverseUri} size={100} label="Awers" />
            </View>
          ) : null}
          {reverseUri ? (
            <View style={styles.photoWrap}>
              <Text variant="labelSmall" style={{ color: colors.textMuted }}>
                Rewers
              </Text>
              <CoinImage uri={reverseUri} size={100} label="Rewers" />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function formatPln(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v} PLN`;
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; textMuted: string };
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { flex: 1 },
  value: { fontWeight: '600', textAlign: 'right' },
  notes: { marginTop: 4, gap: 4 },
  photos: { flexDirection: 'row', gap: 12, marginTop: 8 },
  photoWrap: { flex: 1, gap: 6, alignItems: 'center' },
});
