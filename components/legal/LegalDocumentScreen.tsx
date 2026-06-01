import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  title: string;
  body: string;
};

export function LegalDocumentScreen({ title, body }: Props) {
  const { colors } = useAppTheme();
  return (
    <SafeScreen>
      <KeyboardAwareScroll contentContainerStyle={styles.pad}>
        <Text variant="headlineSmall" style={{ color: colors.text, marginBottom: 16 }}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.text, lineHeight: 24 }}>
          {body}
        </Text>
      </KeyboardAwareScroll>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
});
