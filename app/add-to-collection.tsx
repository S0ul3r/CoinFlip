import { DatePickerField } from '@/components/forms/DatePickerField';
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as coinRepo from '@/services/database/coinRepository';
import * as collectionRepo from '@/services/database/collectionRepository';
import { pushCollectionToSupabase } from '@/services/sync/collectionSync';
import { pickCoinPhotoUri } from '@/utils/pickCoinPhoto';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

export default function AddToCollectionScreen() {
  const {
    coinId: rawCoinId,
    name: nameParam,
    year: yearParam,
    denomination: denominationParam,
    description: descriptionParam,
    material: materialParam,
  } = useLocalSearchParams<{
    coinId?: string;
    name?: string;
    year?: string;
    denomination?: string;
    description?: string;
    material?: string;
  }>();
  const coinId = rawCoinId ? decodeURIComponent(rawCoinId) : '';
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();

  const coin = useMemo(
    () => (coinId ? coinRepo.getCoinById(coinId) : null),
    [coinId],
  );

  const [manualName, setManualName] = useState(nameParam ?? '');
  const [manualYear, setManualYear] = useState(yearParam ?? '');
  const [manualDenomination, setManualDenomination] = useState(denominationParam ?? '');
  const [manualMaterial, setManualMaterial] = useState(materialParam ?? '');
  const [manualDescription, setManualDescription] = useState(descriptionParam ?? '');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [obverse, setObverse] = useState<string | null>(null);
  const [reverse, setReverse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pick(which: 'obverse' | 'reverse') {
    const uri = await pickCoinPhotoUri();
    if (!uri) return;
    if (which === 'obverse') setObverse(uri);
    else setReverse(uri);
  }

  async function onSave() {
    if (!user?.id) {
      setMsg('Zaloguj się, aby zapisać monetę');
      return;
    }
    if (!coin && !manualName.trim()) {
      setMsg('Podaj nazwę monety');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let targetCoinId = coinId;
      if (!coin) {
        const now = new Date().toISOString();
        targetCoinId = `custom-${user.id}-${Crypto.randomUUID()}`;
        coinRepo.upsertCoin({
          id: targetCoinId,
          owner_user_id: user.id,
          is_custom: 1,
          name: manualName.trim(),
          series: null,
          denomination: manualDenomination
            ? parseFloat(manualDenomination.replace(',', '.'))
            : null,
          year: manualYear ? parseInt(manualYear, 10) : null,
          mint: null,
          mintage: null,
          material: manualMaterial.trim() || null,
          weight_g: null,
          diameter_mm: null,
          quality: null,
          description: manualDescription.trim() || null,
          image_obverse: obverse,
          image_reverse: reverse,
          issue_price: currentValue ? parseFloat(currentValue.replace(',', '.')) : null,
          category: 'custom',
          source_url: null,
          created_at: now,
          updated_at: now,
        });
      }

      collectionRepo.insertCollectionItem(user.id, {
        coin_id: targetCoinId,
        purchase_price: purchasePrice ? parseFloat(purchasePrice.replace(',', '.')) : null,
        current_value: currentValue ? parseFloat(currentValue.replace(',', '.')) : null,
        purchase_date: purchaseDate || null,
        condition: null,
        notes: notes || null,
        my_photo_obverse: obverse,
        my_photo_reverse: reverse,
        is_for_sale: 0,
        added_at: null,
      });
      await pushCollectionToSupabase(user.id);
      await queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
      router.replace('/(tabs)/collection');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeScreen>
      <KeyboardAwareScroll contentContainerStyle={styles.pad}>
        <Text variant="labelLarge" style={[styles.kicker, { color: colors.textSubtle }]}>
          {coin ? 'Dodaj z katalogu' : 'Dodaj ręcznie'}
        </Text>
        <Text variant="headlineMedium" style={{ color: colors.text }}>
          {coin?.name ?? 'Nowa moneta'}
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted, marginBottom: 4 }}>
          {coin
            ? `${coin.year ?? '—'} · ${coin.denomination ?? '—'} PLN`
            : 'Wpisz podstawowe dane i dodaj zdjęcia.'}
        </Text>

        {coin ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="titleSmall" style={{ color: colors.gold, marginBottom: 4 }}>
              Dane z katalogu
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Seria: {coin.series ?? '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Mennica / emitent: {coin.mint ?? '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Materiał: {coin.material ?? '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Nakład: {coin.mintage != null ? String(coin.mintage) : '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Średnica: {coin.diameter_mm != null ? `${coin.diameter_mm} mm` : '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Waga: {coin.weight_g != null ? `${coin.weight_g} g` : '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Jakość (emisja): {coin.quality ?? '—'}
            </Text>
            {coin.description ? (
              <Text variant="bodySmall" style={{ color: colors.text, marginTop: 8 }}>
                {coin.description.length > 400
                  ? `${coin.description.slice(0, 400)}…`
                  : coin.description}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!coin ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TextInput label="Nazwa monety" mode="outlined" value={manualName} onChangeText={setManualName} />
            <TextInput
              label="Rok"
              mode="outlined"
              keyboardType="number-pad"
              value={manualYear}
              onChangeText={setManualYear}
            />
            <TextInput
              label="Nominał (PLN)"
              mode="outlined"
              keyboardType="decimal-pad"
              value={manualDenomination}
              onChangeText={setManualDenomination}
            />
            <TextInput label="Materiał" mode="outlined" value={manualMaterial} onChangeText={setManualMaterial} />
            <TextInput
              label="Opis monety"
              mode="outlined"
              multiline
              value={manualDescription}
              onChangeText={setManualDescription}
            />
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="titleMedium" style={{ color: colors.text }}>
            Wycena i zakup
          </Text>
          <TextInput
            label="Cena zakupu (PLN)"
            mode="outlined"
            keyboardType="decimal-pad"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
          />
          <TextInput
            label="Aktualna wartość (PLN)"
            mode="outlined"
            keyboardType="decimal-pad"
            value={currentValue}
            onChangeText={setCurrentValue}
          />
          <DatePickerField label="Data zakupu" value={purchaseDate} onChange={setPurchaseDate} />
        </View>

        <TextInput label="Notatki" mode="outlined" multiline value={notes} onChangeText={setNotes} />

        <View style={styles.row}>
          <Button mode="outlined" icon={obverse ? 'check' : 'camera'} onPress={() => pick('obverse')}>
            {obverse ? 'Awers dodany' : 'Dodaj awers'}
          </Button>
          <Button mode="outlined" icon={reverse ? 'check' : 'camera'} onPress={() => pick('reverse')}>
            {reverse ? 'Rewers dodany' : 'Dodaj rewers'}
          </Button>
        </View>

        {msg ? <Text style={{ color: colors.error }}>{msg}</Text> : null}
        <Button mode="contained" onPress={onSave} loading={busy} disabled={busy} style={styles.save}>
          Zapisz w kolekcji
        </Button>
      </KeyboardAwareScroll>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1 },
  card: { gap: 10, padding: 14, borderRadius: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  save: { marginTop: 16 },
});
