import { useAppTheme } from '@/contexts/AppThemeContext';
import type { Coin } from '@/types/coin.types';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { CoinImage } from './CoinImage';

type Props = {
  coin: Coin;
  marketPrice: number | null;
  issuePrice: number | null;
  /** Shown above catalog data (e.g. user's collection entry). */
  header?: ReactNode;
};

/** `coins.description` only — strip HTML/noise for UI; empty → treat as no description. */
function displayCatalogDescription(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const plain = t.replaceAll(/<[^>]*>/g, ' ').replaceAll(/\s+/g, ' ').trim();
  return plain.length > 0 ? plain : null;
}

export function CoinDetail({ coin, marketPrice, issuePrice, header }: Props) {
  const { colors } = useAppTheme();
  const catalogDescription = useMemo(() => displayCatalogDescription(coin.description), [coin.description]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      {header}
      <View style={styles.images}>
        <View style={styles.imgBlock}>
          <Text variant="labelMedium">Awers</Text>
          <CoinImage uri={coin.image_obverse} size={140} label="Awers" />
        </View>
        <View style={styles.imgBlock}>
          <Text variant="labelMedium">Rewers</Text>
          <CoinImage uri={coin.image_reverse} size={140} label="Rewers" />
        </View>
      </View>

      <Text variant="headlineSmall" style={styles.title}>
        {coin.name}
      </Text>
      <Text variant="bodyMedium" style={[styles.muted, { color: colors.textMuted }]}>
        {coin.year ?? '—'} · {coin.series ?? '—'} · {coin.mint ?? '—'}
      </Text>

      <Divider style={styles.div} />

      <Row label="Nominał" value={coin.denomination != null ? `${coin.denomination} PLN` : '—'} />
      <Row label="Materiał" value={coin.material ?? '—'} />
      <Row label="Nakład" value={coin.mintage != null ? String(coin.mintage) : '—'} />
      <Row label="Średnica" value={coin.diameter_mm != null ? `${coin.diameter_mm} mm` : '—'} />
      <Row label="Waga" value={coin.weight_g != null ? `${coin.weight_g} g` : '—'} />
      <Row label="Jakość" value={coin.quality ?? '—'} />
      <Row label="Kategoria" value={coin.category ?? '—'} />

      <Divider style={styles.div} />

      <Row label="Cena emisyjna" value={issuePrice != null ? `${issuePrice} PLN` : '—'} />
      <Row label="Cena rynkowa (szac.)" value={marketPrice != null ? `${marketPrice} PLN` : '—'} />

      {catalogDescription ? (
        <>
          <Divider style={styles.div} />
          <Text variant="titleMedium">Opis</Text>
          <Text variant="bodyMedium" style={styles.desc}>
            {catalogDescription}
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 48 },
  images: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  imgBlock: { alignItems: 'center', gap: 8 },
  title: { marginTop: 8 },
  muted: { opacity: 0.75, marginTop: 4 },
  div: { marginVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  label: { flex: 1, opacity: 0.7 },
  value: { flex: 1, textAlign: 'right', fontWeight: '600' },
  desc: { marginTop: 8 },
});
