import { useAppTheme } from '@/contexts/AppThemeContext';
import type { Coin } from '@/types/coin.types';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { CoinImage } from './CoinImage';

type Props = {
  coin: Coin;
  subtitle?: string;
  onPress?: () => void;
};

export function CoinCard({ coin, subtitle, onPress }: Props) {
  const { colors } = useAppTheme();

  const content = (
    <View style={styles.row}>
      <CoinImage uri={coin.image_obverse} label={coin.name} />
      <View style={styles.textCol}>
        <Text variant="titleMedium" numberOfLines={2} style={{ color: colors.text }}>
          {coin.name}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted, marginTop: 4 }}>
          {coin.year ?? '—'} · {coin.denomination != null ? `${coin.denomination} PLN` : '—'}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: colors.success, marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
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
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 22,
    marginBottom: 8,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', gap: 12 },
  textCol: { flex: 1, justifyContent: 'center' },
});
