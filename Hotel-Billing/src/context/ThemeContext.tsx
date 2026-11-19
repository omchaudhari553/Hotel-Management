import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'system' | 'light' | 'dark' | 'hotel' | 'emerald';

interface ThemeContextType {
  theme: ThemeType;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeType) => void;
}

const OWNER_THEME_STORAGE_KEY = 'owner_admin_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem(OWNER_THEME_STORAGE_KEY) || localStorage.getItem('ajalkar_theme');
    if (saved === 'system' || saved === 'dark' || saved === 'light') {
      return saved as ThemeType;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(OWNER_THEME_STORAGE_KEY) || localStorage.getItem('ajalkar_theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
    return getSystemTheme();
  });

  const applyTheme = (themeName: ThemeType) => {
    localStorage.setItem(OWNER_THEME_STORAGE_KEY, themeName);
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-industry');
    }
    const resolved = themeName === 'system' ? getSystemTheme() : (themeName === 'dark' ? 'dark' : 'light');
    setResolvedTheme(resolved);
    window.dispatchEvent(new CustomEvent('owner-theme-changed', { detail: { theme: themeName, resolvedTheme: resolved } }));
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        if (theme === 'system') {
          const sys = e.matches ? 'dark' : 'light';
          setResolvedTheme(sys);
        }
      };
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    const savedTheme = (typeof window !== 'undefined'
      ? (localStorage.getItem(OWNER_THEME_STORAGE_KEY) || localStorage.getItem('ajalkar_theme'))
      : 'system') as ThemeType || 'system';
    const resolved = savedTheme === 'dark' ? 'dark' : (savedTheme === 'light' ? 'light' : getSystemTheme());
    return {
      theme: savedTheme,
      resolvedTheme: resolved,
      setTheme: (newTheme: ThemeType) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(OWNER_THEME_STORAGE_KEY, newTheme);
          if (typeof document !== 'undefined') {
            document.documentElement.removeAttribute('data-theme');
          }
          window.dispatchEvent(new CustomEvent('owner-theme-changed', { detail: { theme: newTheme } }));
        }
      },
    };
  }
  return context;
};

export default ThemeContext;
