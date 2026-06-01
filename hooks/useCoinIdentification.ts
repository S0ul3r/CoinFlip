import { identifyCoinHybrid } from '@/services/vision/hybridIdentify';
import * as ImageManipulator from 'expo-image-manipulator';

export async function prepareAndIdentify(imageUri: string) {
  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
  );

  const { identification, matchedCoinId, candidates } = await identifyCoinHybrid(manipulated.uri);
  return {
    identification,
    matchedCoinId,
    candidates,
    workingUri: manipulated.uri,
  };
}
