import { CameraView } from 'expo-camera';
import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScanGuide } from './ScanGuide';

type Props = {
  onReady?: () => void;
};

export const ScannerCamera = forwardRef<CameraView, Props>(({ onReady }, ref) => {
  return (
    <View style={styles.wrap}>
      <CameraView
        ref={ref}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        onCameraReady={onReady}
      />
      <ScanGuide />
    </View>
  );
});

ScannerCamera.displayName = 'ScannerCamera';

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
