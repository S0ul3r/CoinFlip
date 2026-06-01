import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { SafeScreen } from '@/components/SafeScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <Text variant="titleLarge">CoinFlip</Text>
          <Text style={styles.help}>
            Skonfiguruj zmienne środowiskowe:{'\n'}
            EXPO_PUBLIC_SUPABASE_URL{'\n'}
            EXPO_PUBLIC_SUPABASE_ANON_KEY{'\n'}
            Zobacz plik .env.example i README.md.
          </Text>
        </View>
      </SafeScreen>
    );
  }

  async function onSignIn() {
    setBusy(true);
    setMessage(null);
    const { error } = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (error) setMessage(error.message);
    else router.replace('/(tabs)');
  }

  async function onSignUp() {
    setBusy(true);
    setMessage(null);
    const { error } = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) setMessage(error.message);
    else setMessage('Sprawdź e-mail w celu potwierdzenia konta (jeśli włączone w Supabase).');
  }

  return (
    <SafeScreen>
      <KeyboardAwareScroll contentContainerStyle={styles.pad}>
        <Text variant="labelLarge" style={[styles.kicker, { color: colors.textSubtle }]}>
          Polish coins tracker
        </Text>
        <Text variant="headlineMedium" style={[styles.title, { color: colors.text }]}>
          CoinFlip
        </Text>
        <Text variant="bodyMedium" style={[styles.sub, { color: colors.textMuted }]}>
          Zaloguj się, aby zsynchronizować katalog i kolekcję.
        </Text>
        <TextInput
          label="E-mail"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          label="Hasło"
          mode="outlined"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {message ? (
          <Text variant="bodySmall" style={styles.msg}>
            {message}
          </Text>
        ) : null}
        <Button mode="contained" onPress={onSignIn} loading={busy} disabled={busy} style={styles.btn}>
          Zaloguj
        </Button>
        <Button mode="outlined" onPress={onSignUp} disabled={busy}>
          Załóż konto
        </Button>
      </KeyboardAwareScroll>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8 },
  kicker: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  title: { textAlign: 'center', fontWeight: '800' },
  sub: { textAlign: 'center', marginBottom: 16 },
  input: { marginBottom: 4 },
  btn: { marginTop: 12 },
  msg: { color: '#c62828', marginVertical: 4 },
  center: { flex: 1, padding: 24, justifyContent: 'center' },
  help: { marginTop: 16, lineHeight: 22 },
});
