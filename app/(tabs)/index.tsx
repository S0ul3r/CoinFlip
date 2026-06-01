import { SafeScreen } from '@/components/SafeScreen';
import { ScannerCamera } from '@/components/camera/ScannerCamera';
import { prepareAndIdentify } from '@/hooks/useCoinIdentification';
import { HYBRID_CONFIDENCE_AUTO } from '@/services/vision/hybridIdentify';
import { useScanStore } from '@/store/scanStore';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';

import { useCamera } from '@/hooks/useCamera';

export default function ScannerTab() {
  const router = useRouter();
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCamera();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const setScan = useScanStore((s) => s.setScan);

  const runIdentify = useCallback(
    async (uri: string) => {
      setLoading(true);
      try {
        const { identification, matchedCoinId, candidates, workingUri } =
          await prepareAndIdentify(uri);

        if (
          matchedCoinId &&
          identification.confidence >= HYBRID_CONFIDENCE_AUTO
        ) {
          router.push({
            pathname: '/add-to-collection',
            params: { coinId: matchedCoinId },
          });
          return;
        }

        setScan({
          imageUri: workingUri,
          identification,
          matchedCoinId,
          candidates,
        });
        router.push('/scan/result');
      } catch (e) {
        setSnack((e as Error).message ?? 'Identyfikacja nie powiodła się');
      } finally {
        setLoading(false);
      }
    },
    [router, setScan],
  );

  const onCapture = useCallback(async () => {
    if (!camRef.current || !ready) {
      setSnack('Aparat nie jest gotowy');
      return;
    }
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) await runIdentify(photo.uri);
    } catch (e) {
      setSnack((e as Error).message ?? 'Błąd zdjęcia');
    }
  }, [ready, runIdentify]);

  const onGallery = useCallback(async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      setSnack('Brak uprawnień do galerii');
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!pick.canceled && pick.assets[0]?.uri) {
      await runIdentify(pick.assets[0].uri);
    }
  }, [runIdentify]);

  if (!permission) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeScreen>
    );
  }

  if (!permission.granted) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text style={styles.centerText}>Potrzebny dostęp do aparatu</Text>
          <Button onPress={requestPermission}>Zezwól</Button>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
    <View style={styles.screen}>
      <Text variant="titleLarge" style={styles.header}>
        CoinFlip
      </Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Zrób zdjęcie monety albo dodaj ją ręcznie do kolekcji.
      </Text>
      <Button
        mode="contained-tonal"
        icon="plus"
        style={styles.manual}
        onPress={() => router.push('/add-to-collection')}
        disabled={loading}>
        Dodaj monetę ręcznie
      </Button>
      <View style={styles.cameraBox}>
        <ScannerCamera ref={camRef} onReady={() => setReady(true)} />
        {loading ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#C9A227" />
            <Text variant="bodyLarge">Skanowanie monety…</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button mode="contained" icon="camera" onPress={onCapture} disabled={loading}>
          Skanuj
        </Button>
        <Button mode="outlined" icon="image" onPress={onGallery} disabled={loading}>
          Galeria
        </Button>
      </View>
      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={4000}>
        {snack}
      </Snackbar>
    </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 12 },
  header: { textAlign: 'center', color: '#F8FAFC', fontWeight: '800' },
  hint: { textAlign: 'center', marginTop: 8, marginBottom: 12, color: '#A7B0C0' },
  manual: { marginBottom: 14, borderRadius: 18 },
  cameraBox: { flex: 1, minHeight: 320, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,10,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginBottom: 12, textAlign: 'center', color: '#F8FAFC' },
});
