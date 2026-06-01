import { DatePickerField } from '@/components/forms/DatePickerField';
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as collectionRepo from '@/services/database/collectionRepository';
import { pushCollectionToSupabase } from '@/services/sync/collectionSync';
import { pickCoinPhotoUri } from '@/utils/pickCoinPhoto';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

export default function EditCollectionScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : '';
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();

  const item = useMemo(
    () => (user?.id && id ? collectionRepo.getCollectionItemById(user.id, id) : null),
    [user?.id, id],
  );

  const [purchasePrice, setPurchasePrice] = useState(
    () => (item?.purchase_price != null ? String(item.purchase_price) : ''),
  );
  const [currentValue, setCurrentValue] = useState(
    () => (item?.current_value != null ? String(item.current_value) : ''),
  );
  const [purchaseDate, setPurchaseDate] = useState(() => item?.purchase_date ?? '');
  const [notes, setNotes] = useState(() => item?.notes ?? '');
  const [obverse, setObverse] = useState<string | null>(() => item?.my_photo_obverse ?? null);
  const [reverse, setReverse] = useState<string | null>(() => item?.my_photo_reverse ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!item || !user?.id) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text>Nie znaleziono pozycji w kolekcji.</Text>
          <Button onPress={() => router.back()}>Wstecz</Button>
        </View>
      </SafeScreen>
    );
  }

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      collectionRepo.updateCollectionItem(user!.id, id, {
        purchase_price: purchasePrice ? parseFloat(purchasePrice.replace(',', '.')) : null,
        current_value: currentValue ? parseFloat(currentValue.replace(',', '.')) : null,
        purchase_date: purchaseDate || null,
        notes: notes || null,
        my_photo_obverse: obverse,
        my_photo_reverse: reverse,
      });
      await pushCollectionToSupabase(user!.id);
      await queryClient.invalidateQueries({ queryKey: ['collection', user!.id] });
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeScreen>
      <KeyboardAwareScroll contentContainerStyle={styles.pad}>
        <Text variant="headlineSmall" style={{ color: colors.text }}>
          Edytuj monetę
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted, marginBottom: 8 }}>
          {item.coin_name ?? item.coin_id}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
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
          <TextInput
            label="Notatki"
            mode="outlined"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={styles.row}>
          <Button
            mode="outlined"
            icon={obverse ? 'check' : 'camera'}
            onPress={async () => {
              const uri = await pickCoinPhotoUri();
              if (uri) setObverse(uri);
            }}>
            {obverse ? 'Awers dodany' : 'Awers'}
          </Button>
          <Button
            mode="outlined"
            icon={reverse ? 'check' : 'camera'}
            onPress={async () => {
              const uri = await pickCoinPhotoUri();
              if (uri) setReverse(uri);
            }}>
            {reverse ? 'Rewers dodany' : 'Rewers'}
          </Button>
        </View>

        {msg ? <Text style={{ color: colors.error }}>{msg}</Text> : null}
        <Button mode="contained" onPress={onSave} loading={busy} disabled={busy} style={styles.save}>
          Zapisz zmiany
        </Button>
      </KeyboardAwareScroll>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  card: { gap: 10, padding: 14, borderRadius: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  save: { marginTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
});
