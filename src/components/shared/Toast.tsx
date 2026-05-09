'use client';

import React from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none w-full max-w-sm px-4">
      <div className="glass bg-white/10 text-white px-6 py-3 rounded-2xl shadow-lg border-white/10 flex items-center gap-3 justify-between pointer-events-auto animate-toast-in">
        <span className="font-semibold text-sm leading-tight">{message}</span>
        <button 
          onClick={onClose}
          className="hover:bg-white/10 transition-all p-1.5 rounded-lg cursor-pointer"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
