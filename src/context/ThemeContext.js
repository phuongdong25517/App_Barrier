import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export const lightColors = {
  bg: '#f0f4f8',
  surface: '#ffffff',
  card: '#ffffff',
  border: '#d0e0ea',
  accent: '#0099bb',
  accentDim: '#0077aa',
  green: '#00aa55',
  red: '#dd2244',
  orange: '#cc6600',
  yellow: '#cc9900',
  text: '#0a0e14',
  muted: '#6688aa',
  white: '#ffffff',
};

export const darkColors = {
  bg: '#0a0e14',
  surface: '#111820',
  card: '#161e28',
  border: '#1e2c3a',
  accent: '#00d4ff',
  accentDim: '#0099bb',
  green: '#00ff88',
  red: '#ff3355',
  orange: '#ff8c00',
  yellow: '#ffd600',
  text: '#e8f4ff',
  muted: '#5a7a94',
  white: '#ffffff',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const Colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, Colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
