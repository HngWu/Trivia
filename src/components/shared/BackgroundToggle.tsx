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
        <span className="text-[9px] font-bold tracking-widest text-gray-500 group-hover:text-foreground transition-colors uppercase whitespace-nowrap hidden sm:inline">
          {background === 'syn-v2' ? 'Syn V2' : background}
        </span>
      </button>

      {/* Animation Toggle */}
      <button 
        onClick={toggleAnimation}
        className={`flex items-center justify-center w-8 h-8 glass rounded-xl border-white/5 hover:border-white/20 transition-all focus:ring-2 focus:ring-white/20 focus:outline-none ${!isAnimationEnabled ? 'opacity-50' : ''}`}
        title={isAnimationEnabled ? "Disable Animation" : "Enable Animation"}
      >
        {isAnimationEnabled ? (
          <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
