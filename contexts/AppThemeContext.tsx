import { AppThemes, type AppThemeMode } from '@/constants/appTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

const STORAGE_KEY = 'coinflip_theme_mode';

type AppThemeContextValue = {
  mode: AppThemeMode;
  colors: (typeof AppThemes)['dark'];
  paperTheme: MD3Theme;
  setMode: (mode: AppThemeMode) => void;
  isReady: boolean;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function buildPaperTheme(mode: AppThemeMode): MD3Theme {
  const c = AppThemes[mode];
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 5,
    colors: {
      ...base.colors,
      primary: mode === 'dark' ? '#F8FAFC' : c.accent,
      onPrimary: mode === 'dark' ? '#1A1F2B' : '#FFFFFF',
      secondary: c.accent,
      tertiary: c.success,
      background: c.background,
      surface: c.surface,
      surfaceVariant: c.surfaceVariant,
      outline: c.border,
      onSurface: c.text,
      onSurfaceVariant: c.textMuted,
      elevation: {
        ...base.colors.elevation,
        level0: c.background,
        level1: c.surface,
        level2: c.surfaceVariant,
      },
    },
  };
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setModeState(stored);
      })
      .finally(() => setIsReady(true));
  }, []);

  const setMode = useCallback((next: AppThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      colors: AppThemes[mode],
      paperTheme: buildPaperTheme(mode),
      setMode,
      isReady,
    }),
    [mode, setMode, isReady],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
