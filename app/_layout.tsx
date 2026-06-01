import { useAppTheme } from '@/contexts/AppThemeContext';
import { useProtectedNavigation } from '@/hooks/useProtectedNavigation';
import { AppProviders } from '@/providers/AppProviders';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootStack() {
  useProtectedNavigation();
  const { mode, colors } = useAppTheme();
  const navBase = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navBase,
        colors: {
          ...navBase.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coin/[id]" options={{ title: 'Moneta' }} />
        <Stack.Screen name="scan/result" options={{ title: 'Wynik skanowania' }} />
        <Stack.Screen name="add-to-collection" options={{ title: 'Dodaj do kolekcji' }} />
        <Stack.Screen name="edit-collection/[id]" options={{ title: 'Edytuj monetę' }} />
        <Stack.Screen name="legal/privacy-policy" options={{ title: 'Polityka prywatności' }} />
        <Stack.Screen name="legal/terms" options={{ title: 'Regulamin' }} />
      </Stack>
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { mode } = useAppTheme();
  return (
    <>
      <RootStack />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <RootLayoutInner />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
