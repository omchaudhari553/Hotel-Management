import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'hotel' | 'emerald';

interface ThemeContextType {
  theme: ThemeType;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeType) => void;
}

const OWNER_THEME_STORAGE_KEY = 'owner_admin_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem(OWNER_THEME_STORAGE_KEY) || localStorage.getItem('ajalkar_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved as ThemeType;
    }
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(OWNER_THEME_STORAGE_KEY) || localStorage.getItem('ajalkar_theme');
    if (saved === 'dark') return 'dark';
    return 'light';
  });

  const applyTheme = (themeName: ThemeType) => {
    const target = themeName === 'dark' ? 'dark' : 'light';
    localStorage.setItem(OWNER_THEME_STORAGE_KEY, target);
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-industry');
    }
    setResolvedTheme(target);
    window.dispatchEvent(new CustomEvent('owner-theme-changed', { detail: { theme: target, resolvedTheme: target } }));
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);
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
      : 'light') as ThemeType || 'light';
    const resolved = savedTheme === 'dark' ? 'dark' : 'light';
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
