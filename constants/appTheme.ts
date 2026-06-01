export type AppThemeMode = 'dark' | 'light';

export type AppColorPalette = {
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  accent: string;
  success: string;
  error: string;
  tabBar: string;
  tabBarBorder: string;
  tabIconDefault: string;
  tabIconSelected: string;
  gold: string;
};

export const AppThemes: Record<AppThemeMode, AppColorPalette> = {
  dark: {
    background: '#05070A',
    surface: '#10141C',
    surfaceVariant: '#161C27',
    border: '#202838',
    text: '#F8FAFC',
    textMuted: '#A7B0C0',
    textSubtle: '#8EA0B8',
    primary: '#F8FAFC',
    accent: '#7C5CFF',
    success: '#42E68A',
    error: '#FF6B6B',
    tabBar: '#0B0F16',
    tabBarBorder: '#202838',
    tabIconDefault: '#718096',
    tabIconSelected: '#F8FAFC',
    gold: '#C9A227',
  },
  light: {
    background: '#F2F4F8',
    surface: '#FFFFFF',
    surfaceVariant: '#E8ECF2',
    border: '#D5DCE6',
    text: '#1A1F2B',
    textMuted: '#4A5568',
    textSubtle: '#6B7280',
    primary: '#1A1F2B',
    accent: '#5B4BD4',
    success: '#2E7D4A',
    error: '#C62828',
    tabBar: '#FFFFFF',
    tabBarBorder: '#D5DCE6',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#1A1F2B',
    gold: '#9A7B1A',
  },
};
