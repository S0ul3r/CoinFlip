import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type PhotoSource = 'camera' | 'gallery';

export function pickPhotoSource(): Promise<PhotoSource | null> {
  return new Promise((resolve) => {
    Alert.alert('Dodaj zdjęcie', 'Skąd chcesz dodać zdjęcie monety?', [
      { text: 'Anuluj', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Galeria', onPress: () => resolve('gallery') },
      { text: 'Aparat', onPress: () => resolve('camera') },
    ]);
  });
}

export async function pickCoinPhotoUri(): Promise<string | null> {
  const source = await pickPhotoSource();
  if (!source) return null;

  if (source === 'gallery') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Brak uprawnień', 'Zezwól na dostęp do galerii w ustawieniach telefonu.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    return res.canceled ? null : (res.assets[0]?.uri ?? null);
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Brak uprawnień', 'Zezwól na dostęp do aparatu w ustawieniach telefonu.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    quality: 0.9,
  });
  return res.canceled ? null : (res.assets[0]?.uri ?? null);
}
