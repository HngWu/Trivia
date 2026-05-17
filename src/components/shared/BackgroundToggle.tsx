'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function BackgroundToggle() {
  const { background, isAnimationEnabled, toggleBackground, toggleAnimation } = useTheme();

  return (
    <div className="flex items-center gap-1.5">
      {/* Mode Switcher */}
      <button 
        onClick={toggleBackground}
        className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl border-white/5 hover:border-white/20 transition-all group focus:ring-2 focus:ring-white/20 focus:outline-none"
        title="Cycle Background Mode"
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          {background === 'synapse' && (
            <svg className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {background === 'stream' && (
            <svg className="w-3.5 h-3.5 text-white group-hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
          {background === 'syn-v2' && (
            <svg className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.384l-.548-.547z" />
            </svg>
          )}
        </div>
        <span className="text-[9px] font-bold tracking-widest text-muted-foreground group-hover:text-foreground transition-colors uppercase whitespace-nowrap hidden sm:inline">
          {background === 'syn-v2' ? 'Syn V2' : background}
        </span>
      </button>

      {/* Animation Toggle */}
      <button 
        onClick={toggleAnimation}
        className={`flex items-center justify-center w-8 h-8 glass rounded-xl border-white/5 hover:border-white/20 transition-all focus:ring-2 focus:ring-white/20 focus:outline-none ${!isAnimationEnabled ? 'opacity-40' : ''}`}
        title={isAnimationEnabled ? "Disable Background" : "Enable Background"}
      >
        {isAnimationEnabled ? (
          <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c3.788 0 7.261 2.312 8.878 5.658.212.442.212.942 0 1.384C19.261 16.688 15.788 19 12 19c-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.003 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.003 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </button>
    </div>
  );
}
