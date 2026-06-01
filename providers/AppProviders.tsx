import { AppThemeProvider, useAppTheme } from '@/contexts/AppThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSyncOnAuth } from '@/hooks/useSyncOnAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { PaperProvider } from 'react-native-paper';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
});

function SyncBridge() {
  useSyncOnAuth();
  return null;
}

function ThemedPaper({ children }: { children: React.ReactNode }) {
  const { paperTheme } = useAppTheme();
  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <ThemedPaper>
          <AuthProvider>
            <SyncBridge />
            {children}
          </AuthProvider>
        </ThemedPaper>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}
