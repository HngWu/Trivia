'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type BackgroundType = 'synapse' | 'stream';

interface ThemeContextType {
  background: BackgroundType;
  toggleBackground: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<BackgroundType>('synapse');

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('background_pref');
    if (saved === 'synapse' || saved === 'stream') {
      setBackground(saved);
    }
  }, []);

  const toggleBackground = () => {
    const next = background === 'synapse' ? 'stream' : 'synapse';
    setBackground(next);
    localStorage.setItem('background_pref', next);
  };

  return (
    <ThemeContext.Provider value={{ background, toggleBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
