import { useAppTheme } from '@/contexts/AppThemeContext';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra bottom padding above gesture nav bar */
  bottomInset?: number;
};

/**
 * Keeps content clear of Android status bar, camera cutout, and bottom gesture/nav area.
 */
export function SafeScreen({ children, style, bottomInset = 0 }: Props) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background, paddingBottom: bottomInset }, style]}
      edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}
