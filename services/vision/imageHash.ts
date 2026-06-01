import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { gray9x8ToDHashHex, rgbaToGray9x8 } from './dHash';

/** Normalize coin photo and compute dHash for catalog matching. */
export async function computeDHashFromImageUri(imageUri: string): Promise<string> {
  const normalized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 128 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  const base64 = await readAsStringAsync(normalized.uri, { encoding: EncodingType.Base64 });
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decoded = jpeg.decode(raw, { useTArray: true });
  const gray = rgbaToGray9x8(decoded.data, decoded.width, decoded.height);
  return gray9x8ToDHashHex(gray);
}
