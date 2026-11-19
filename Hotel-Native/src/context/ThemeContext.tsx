import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppThemeMode = 'default' | 'light' | 'dark';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  card: string;
  cardSubtle: string;
  cardInner: string;
  text: string;
  textHeading: string;
  textMuted: string;
  textLight: string;
  border: string;
  borderLight: string;
  inputBg: string;
  inputBorder: string;
  primary: string;
  accent: string;
  topHeaderBg: string;
  sidebarBg: string;
  tableHeaderBg: string;
  tableRowEven: string;
  tableRowOdd: string;
  badgeBg: string;
}

export const LIGHT_THEME: ThemeColors = {
  isDark: false,
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSubtle: '#F1F5F9',
  cardInner: '#F8FAFC',
  text: '#0F172A',
  textHeading: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  primary: '#7C2D12',
  accent: '#EA580C',
  topHeaderBg: '#FFFFFF',
  sidebarBg: '#1E1B18',
  tableHeaderBg: '#F8FAFC',
  tableRowEven: '#FFFFFF',
  tableRowOdd: '#F8FAFC',
  badgeBg: '#F1F5F9',
};

export const DARK_THEME: ThemeColors = {
  isDark: true,
  background: '#0B0F19',
  card: '#161F36',
  cardSubtle: '#1E293B',
  cardInner: '#1E293B',
  text: '#F8FAFC',
  textHeading: '#FFFFFF',
  textMuted: '#94A3B8',
  textLight: '#64748B',
  border: '#2A364F',
  borderLight: '#1E293B',
  inputBg: '#0F172A',
  inputBorder: '#2A364F',
  primary: '#B45309',
  accent: '#EA580C',
  topHeaderBg: '#161F36',
  sidebarBg: '#090D16',
  tableHeaderBg: '#1E293B',
  tableRowEven: '#161F36',
  tableRowOdd: '#121A2D',
  badgeBg: '#1E293B',
};

export interface ThemeContextType {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => Promise<void>;
  isDark: boolean;
  theme: ThemeColors;
}

const STORAGE_KEY = '@hotel_app_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'default',
  setThemeMode: async () => {},
  isDark: false,
  theme: LIGHT_THEME,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<AppThemeMode>('default');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(() => {
    try {
      return typeof Appearance !== 'undefined' && Appearance.getColorScheme ? Appearance.getColorScheme() : 'light';
    } catch (_e) {
      return 'light';
    }
  });

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'default') {
          setThemeModeState(saved as AppThemeMode);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    };
    loadTheme();

    let subscription: { remove: () => void } | undefined;
    try {
      if (typeof Appearance !== 'undefined' && typeof Appearance.addChangeListener === 'function') {
        subscription = Appearance.addChangeListener(({ colorScheme }) => {
          setSystemScheme(colorScheme);
        });
      }
    } catch (err) {
      console.warn('Appearance listener not ready:', err);
    }

    return () => {
      try {
        subscription?.remove?.();
      } catch (_e) {}
    };
  }, []);

  const setThemeMode = async (mode: AppThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  // The branch Hotel POS & Operations software strictly retains its original crisp daylight design
  // Only the Owner Admin Panel has independent customizable theme modes (Daylight / Midnight)
  const isDark = false;
  const theme = LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'default',
      setThemeMode: async () => {},
      isDark: false,
      theme: LIGHT_THEME,
    };
  }
  return context;
};
