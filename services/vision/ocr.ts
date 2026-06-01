import { isSupported, recognizeText } from 'expo-mlkit-ocr';
import { Platform } from 'react-native';
import { parseCoinFieldsFromOcrText, type OcrCoinFields } from './ocrParse';

/** On-device OCR via Google ML Kit (Android) / Apple Vision or ML Kit (iOS). Requires dev build. */
async function recognizeWithMlKit(uri: string): Promise<string> {
  if (Platform.OS === 'web') return '';
  if (!isSupported()) return '';

  try {
    const result = await recognizeText(uri);
    return result.text?.trim() ?? '';
  } catch (e) {
    console.warn('[CoinFlip] OCR failed', e);
    return '';
  }
}

export async function extractCoinFieldsFromImage(uri: string): Promise<OcrCoinFields> {
  const raw = await recognizeWithMlKit(uri);
  if (!raw) {
    return { year: null, denomination: null, rawText: '' };
  }
  return parseCoinFieldsFromOcrText(raw);
}
