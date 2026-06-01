import { useAppTheme } from '@/contexts/AppThemeContext';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  totalPurchase: number;
  totalMarket: number;
  count: number;
};

export function CollectionStats({ totalPurchase, totalMarket, count }: Props) {
  const { colors } = useAppTheme();
  const gain = totalMarket - totalPurchase;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="labelLarge" style={[styles.kicker, { color: colors.textSubtle }]}>
        Portfolio monet
      </Text>
      <Text variant="headlineMedium" style={{ color: colors.text, marginTop: 8 }}>
        {totalMarket.toFixed(0)} PLN
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        Szacowana wartość kolekcji
      </Text>
      <View style={styles.row}>
        <Stat label="Zapłacono" value={`${totalPurchase.toFixed(0)} PLN`} />
        <Stat label="Monety" value={`${count}`} />
      </View>
      <Text
        variant="titleSmall"
        style={{ color: gain >= 0 ? colors.success : colors.error, marginTop: 8 }}>
        {gain >= 0 ? 'Zysk' : 'Strata'}: {gain >= 0 ? '+' : ''}
        {gain.toFixed(0)} PLN
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stat}>
      <Text variant="labelSmall" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <Text variant="titleMedium" style={{ color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  stat: { flex: 1 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1 },
});
