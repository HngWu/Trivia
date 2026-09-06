'use client';

import React, { useState, useEffect } from 'react';
import { getDatabaseProviderStatus, switchDatabaseProvider } from '@/lib/db/actions';

export default function DatabaseToggle({ onStatusChange }: { onStatusChange?: (msg: string) => void }) {
  const [provider, setProvider] = useState<'sqlite' | 'supabase'>('sqlite');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    getDatabaseProviderStatus().then(status => setProvider(status.provider));
  }, []);

  const handleToggle = async (target: 'sqlite' | 'supabase') => {
    if (target === provider || isUpdating) return;
    setIsUpdating(true);
    try {
      await switchDatabaseProvider(target);
      setProvider(target);
      onStatusChange?.(`Database provider switched to ${target === 'sqlite' ? 'Local SQLite' : 'Cloud Supabase'}`);
      // Refresh page data
      window.location.reload();
    } catch (error) {
      const err = error as Error;
      onStatusChange?.(`Failed to switch database: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-1 glass p-1 rounded-2xl border-white/10 shadow-inner">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleToggle('sqlite')}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center space-x-1.5 ${
          provider === 'sqlite' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${provider === 'sqlite' ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
        <span>SQLite</span>
      </button>

      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleToggle('supabase')}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center space-x-1.5 ${
          provider === 'supabase' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${provider === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
        <span>Supabase</span>
      </button>
    </div>
  );
}
