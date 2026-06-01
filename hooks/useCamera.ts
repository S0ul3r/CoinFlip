import { useCameraPermissions } from 'expo-camera';

export function useCamera() {
  return useCameraPermissions();
}
