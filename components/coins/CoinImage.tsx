import { useAppTheme } from '@/contexts/AppThemeContext';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  uri: string | null | undefined;
  label?: string;
  size?: number;
};

export function CoinImage({ uri, label, size = 72 }: Props) {
  const { colors } = useAppTheme();

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, backgroundColor: colors.surfaceVariant, borderColor: colors.border },
        ]}>
        <Text variant="labelSmall" style={{ color: colors.textSubtle }}>
          ?
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: 8, backgroundColor: colors.surfaceVariant }}
      accessibilityLabel={label}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
