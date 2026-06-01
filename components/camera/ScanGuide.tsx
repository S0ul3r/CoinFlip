import { StyleSheet, View } from 'react-native';

export function ScanGuide() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.dimTop} />
      <View style={styles.row}>
        <View style={styles.dimSide} />
        <View style={styles.frame} />
        <View style={styles.dimSide} />
      </View>
      <View style={styles.dimBottom} />
    </View>
  );
}

const FRAME = 260;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', height: FRAME },
  dimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  dimBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  frame: {
    width: FRAME,
    height: FRAME,
    borderRadius: FRAME / 2,
    borderWidth: 3,
    borderColor: '#C9A227',
  },
});
