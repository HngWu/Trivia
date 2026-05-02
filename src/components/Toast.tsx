'use client';

import React from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
      <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 min-w-[300px] justify-center text-center pointer-events-auto animate-toast-in">
        <span className="font-medium">{message}</span>
        <button 
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity p-1 cursor-pointer"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
