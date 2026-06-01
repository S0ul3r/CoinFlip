import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps'>;

/** Scroll + keyboard avoidance so focused inputs stay visible above the keyboard. */
export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  style,
  keyboardShouldPersistTaps = 'handled',
}: Props) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[{ flexGrow: 1, paddingBottom: 40 }, contentContainerStyle]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
