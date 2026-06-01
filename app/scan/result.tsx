import { SafeScreen } from '@/components/SafeScreen';
import * as coinRepo from '@/services/database/coinRepository';
import { HYBRID_CONFIDENCE_AUTO } from '@/services/vision/hybridIdentify';
import { useScanStore } from '@/store/scanStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function ScanResultScreen() {
  const router = useRouter();
  const imageUri = useScanStore((s) => s.imageUri);
  const identification = useScanStore((s) => s.identification);
  const matchedCoinId = useScanStore((s) => s.matchedCoinId);
  const candidates = useScanStore((s) => s.candidates);

  const candidateCoins = useMemo(
    () =>
      candidates
        .map((c) => ({ ...c, coin: coinRepo.getCoinById(c.coinId) }))
        .filter((c) => c.coin != null),
    [candidates],
  );

  if (!identification) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text>Brak danych skanu. Wróć do zakładki Skaner.</Text>
          <Button onPress={() => router.back()}>Wstecz</Button>
        </View>
      </SafeScreen>
    );
  }

  const matched = matchedCoinId ? coinRepo.getCoinById(matchedCoinId) : null;
  const latest = matchedCoinId ? coinRepo.getLatestPriceForCoin(matchedCoinId) : null;
  const highConfidence = identification.confidence >= HYBRID_CONFIDENCE_AUTO;

  const pickCandidate = (coinId: string) => {
    router.push({ pathname: '/add-to-collection', params: { coinId } });
  };

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.screen}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} contentFit="contain" />
        ) : null}

        {matched && highConfidence ? (
          <Text variant="titleMedium" style={styles.ok}>
            Znaleziono w bazie: {matched.name}
          </Text>
        ) : (
          <Text variant="titleMedium" style={styles.warn}>
            Wybierz monetę z propozycji lub dodaj ręcznie
          </Text>
        )}

        <Text variant="headlineSmall">{identification.name}</Text>
        <Text variant="bodyMedium" style={styles.meta}>
          {identification.year ?? '—'} · {identification.denomination ?? '—'}{' '}
          {identification.denomination_currency}
        </Text>
        <Text variant="bodySmall">
          Pewność: {(identification.confidence * 100).toFixed(0)}%
        </Text>
        {identification.notes ? (
          <Text variant="bodySmall" style={styles.note}>
            {identification.notes}
          </Text>
        ) : null}

        {candidateCoins.length > 0 && !highConfidence ? (
          <View style={styles.candidates}>
            <Text variant="titleSmall" style={styles.candidatesTitle}>
              Propozycje z katalogu
            </Text>
            {candidateCoins.map(({ coinId, score, coin }) => (
              <Pressable
                key={coinId}
                style={styles.candidateRow}
                onPress={() => pickCandidate(coinId)}>
                <View style={styles.candidateText}>
                  <Text variant="bodyLarge">{coin!.name}</Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {coin!.year ?? '—'} · {coin!.denomination ?? '—'} PLN · trafienie {score}
                  </Text>
                </View>
                <Text style={styles.pick}>Wybierz</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {matched ? (
          <>
            <Text variant="bodyLarge" style={styles.price}>
              Cena emisyjna: {matched.issue_price != null ? `${matched.issue_price} PLN` : '—'}
            </Text>
            <Text variant="bodyLarge" style={styles.price}>
              Cena rynkowa: {latest ? `~${latest.price} PLN` : '—'}
            </Text>
          </>
        ) : null}

        <View style={styles.actions}>
          {matchedCoinId && highConfidence ? (
            <Button mode="contained" onPress={() => pickCandidate(matchedCoinId)}>
              Dodaj do kolekcji
            </Button>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={() =>
                  router.push({
                    pathname: '/add-to-collection',
                    params: {
                      name: identification.name,
                      year: identification.year != null ? String(identification.year) : '',
                      denomination:
                        identification.denomination != null
                          ? String(identification.denomination)
                          : '',
                      description: identification.description ?? '',
                      material: identification.material ?? '',
                    },
                  })
                }>
                Dodaj ręcznie
              </Button>
              <Button mode="outlined" onPress={() => router.push('/(tabs)/catalogue')}>
                Przeglądaj katalog
              </Button>
            </>
          )}
          {matchedCoinId && highConfidence ? (
            <Button
              mode="outlined"
              onPress={() => router.push(`/coin/${encodeURIComponent(matchedCoinId)}`)}>
              Szczegóły monety
            </Button>
          ) : null}
          <Button onPress={() => router.replace('/(tabs)')}>Nowy skan</Button>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 8, paddingBottom: 32 },
  photo: { width: '100%', height: 220, borderRadius: 24, backgroundColor: '#10141C' },
  ok: { color: '#42E68A', marginTop: 8 },
  warn: { color: '#FFB86B', marginTop: 8 },
  meta: { color: '#A7B0C0' },
  note: { color: '#7C8798', marginTop: 4 },
  price: { marginTop: 4 },
  candidates: { marginTop: 12, gap: 8 },
  candidatesTitle: { color: '#F8FAFC', marginBottom: 4 },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10141C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#202838',
  },
  candidateText: { flex: 1 },
  pick: { color: '#7C5CFF', fontWeight: '700' },
  actions: { marginTop: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
});
