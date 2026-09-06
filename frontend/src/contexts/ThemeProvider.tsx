import { useEffect, type ReactNode } from 'react';
import { THEME_STORAGE_KEY } from '../constants/app';
import { usePersistentState } from '../hooks/usePersistentState';
import { ThemeContext } from './theme-context';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkTheme, setIsDarkTheme] = usePersistentState(THEME_STORAGE_KEY, false);

  useEffect(() => {
    const background = isDarkTheme ? '#111111' : '#f2f1ed';
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document.body.style.color = isDarkTheme ? '#ffffff' : '#020617';
  }, [isDarkTheme]);

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme: () => setIsDarkTheme((dark) => !dark) }}>
      {children}
    </ThemeContext.Provider>
  );
}
