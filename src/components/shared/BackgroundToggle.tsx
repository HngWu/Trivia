'use client';

import React from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function BackgroundToggle() {
  const { background, toggleBackground } = useTheme();

  return (
    <button 
      onClick={toggleBackground}
      className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl border-white/5 hover:border-white/20 transition-all group focus:ring-2 focus:ring-white/20 focus:outline-none"
      title="Toggle Background Effect"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {background === 'synapse' ? (
          <svg className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-white group-hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        )}
      </div>
      <span className="text-[9px] font-bold tracking-widest text-gray-500 group-hover:text-foreground transition-colors uppercase whitespace-nowrap">
        {background === 'synapse' ? 'Synapse' : 'Stream'}
      </span>
    </button>
  );
}
