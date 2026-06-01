import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import type { AppThemeMode } from '@/constants/appTheme';
import { ACCOUNT_DELETION_WEB_URL } from '@/constants/legalContent';
import { useAuth } from '@/contexts/AuthContext';
import { deleteUserAccount } from '@/services/account/deleteAccount';
import { getDatabase } from '@/services/database/db';
import { triggerPriceRefresh } from '@/services/pricing/priceService';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { pullCollectionFromSupabase, pushCollectionToSupabase } from '@/services/sync/collectionSync';
import { syncCatalogFromSupabase } from '@/services/sync/catalogSync';
import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, SegmentedButtons, Text } from 'react-native-paper';

export default function ProfileTab() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { mode, setMode, colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onDeleteAccount() {
    if (!user?.id) return;
    Alert.alert(
      'Usuń konto',
      'To trwale usunie konto, kolekcję w chmurze i Twoje monety własne. Tej operacji nie można cofnąć.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń konto',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setMsg(null);
            const { error } = await deleteUserAccount(user.id);
            setBusy(false);
            if (error) {
              setMsg(error.message);
              return;
            }
            await queryClient.clear();
            router.replace('/login');
          },
        },
      ],
    );
  }

  async function onSyncCatalog() {
    if (!user?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      getDatabase();
      const r = await syncCatalogFromSupabase();
      await queryClient.invalidateQueries({ queryKey: ['coins'] });
      setMsg(`Zsynchronizowano: ${r.coins} monet, ${r.prices} cen.`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSyncCollection() {
    if (!user?.id) return;
    setBusy(true);
    setMsg(null);
    try {
      getDatabase();
      await pullCollectionFromSupabase(user.id);
      await pushCollectionToSupabase(user.id);
      await queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
      setMsg('Kolekcja zsynchronizowana.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshPrices() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await triggerPriceRefresh();
      if (user?.id) {
        getDatabase();
        await syncCatalogFromSupabase();
        await queryClient.invalidateQueries({ queryKey: ['coins'] });
        await queryClient.invalidateQueries({ queryKey: ['collection', user.id] });
      }
      setMsg(`Ceny odświeżone (wierszy: ${r.updated}).`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.screen}>
        <Text variant="labelLarge" style={[styles.kicker, { color: colors.textSubtle }]}>
          Konto
        </Text>
        <Text variant="titleLarge" style={{ color: colors.text }}>
          Profil
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted, marginTop: 8 }}>
          {user?.email ?? '—'}
        </Text>

        <Divider style={styles.div} />

        <Text variant="titleMedium" style={{ color: colors.text, marginBottom: 8 }}>
          Ustawienia
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="bodyMedium" style={{ color: colors.textMuted, marginBottom: 10 }}>
            Motyw aplikacji
          </Text>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => {
              if (v === 'dark' || v === 'light') setMode(v as AppThemeMode);
            }}
            buttons={[
              { value: 'dark', label: 'Ciemny', icon: 'weather-night' },
              { value: 'light', label: 'Jasny', icon: 'white-balance-sunny' },
            ]}
          />
        </View>

        <Text variant="titleMedium" style={{ color: colors.text, marginBottom: 8 }}>
          Prawne i konto
        </Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Button
            mode="text"
            onPress={() => router.push('/legal/privacy-policy' as Href)}
            style={styles.linkBtn}>
            Polityka prywatności
          </Button>
          <Button mode="text" onPress={() => router.push('/legal/terms' as Href)} style={styles.linkBtn}>
            Regulamin
          </Button>
          <Button
            mode="text"
            onPress={() => void Linking.openURL(ACCOUNT_DELETION_WEB_URL)}
            style={styles.linkBtn}>
            Usuń konto w przeglądarce (link sklepu)
          </Button>
          {user?.id ? (
            <Button
              mode="outlined"
              textColor={colors.error}
              onPress={onDeleteAccount}
              disabled={busy}
              style={styles.deleteBtn}>
              Usuń konto w aplikacji
            </Button>
          ) : null}
        </View>

        <Divider style={styles.div} />

        {!isSupabaseConfigured ? (
          <Text style={{ color: colors.text }}>Uzupełnij EXPO_PUBLIC_SUPABASE_* w .env</Text>
        ) : (
          <>
            <Button mode="contained-tonal" onPress={onSyncCatalog} loading={busy} style={styles.btn}>
              Synchronizuj katalog (SQLite)
            </Button>
            <Button
              mode="outlined"
              onPress={onSyncCollection}
              disabled={!user?.id || busy}
              style={styles.btn}>
              Synchronizuj kolekcję
            </Button>
            <Button mode="outlined" onPress={onRefreshPrices} disabled={busy} style={styles.btn}>
              Odśwież ceny (Edge: refresh-prices)
            </Button>
            <Button mode="contained" onPress={() => signOut()} disabled={busy} style={styles.btn}>
              Wyloguj
            </Button>
          </>
        )}
        {msg ? (
          <Text variant="bodySmall" style={{ marginTop: 16, color: colors.textMuted }}>
            {msg}
          </Text>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingTop: 12, paddingBottom: 32 },
  kicker: { textTransform: 'uppercase', letterSpacing: 1 },
  div: { marginVertical: 16 },
  settingsCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  btn: { marginBottom: 10 },
  linkBtn: { alignSelf: 'flex-start', marginVertical: 0 },
  deleteBtn: { marginTop: 8, borderColor: '#C62828' },
});
