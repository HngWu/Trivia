'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type BackgroundType = 'synapse' | 'stream' | 'syn-v2';

interface ThemeContextType {
  background: BackgroundType;
  isAnimationEnabled: boolean;
  toggleBackground: () => void;
  toggleAnimation: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackground] = useState<BackgroundType>('synapse');
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const savedBg = localStorage.getItem('background_pref');
    if (savedBg === 'synapse' || savedBg === 'stream' || savedBg === 'syn-v2') {
      setBackground(savedBg);
    }
    
    const savedAnim = localStorage.getItem('animation_enabled');
    if (savedAnim !== null) {
      setIsAnimationEnabled(savedAnim === 'true');
    }
  }, []);

  const toggleBackground = () => {
    const modes: BackgroundType[] = ['synapse', 'stream', 'syn-v2'];
    const nextIndex = (modes.indexOf(background) + 1) % modes.length;
    const next = modes[nextIndex];
    setBackground(next);
    localStorage.setItem('background_pref', next);
  };

  const toggleAnimation = () => {
    const next = !isAnimationEnabled;
    setIsAnimationEnabled(next);
    localStorage.setItem('animation_enabled', String(next));
  };

  return (
    <ThemeContext.Provider value={{ background, isAnimationEnabled, toggleBackground, toggleAnimation }}>
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
