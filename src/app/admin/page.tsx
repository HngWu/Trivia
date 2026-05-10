'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="space-y-12 animate-fade-in max-w-4xl mx-auto py-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">Control Center</h2>
        <p className="text-gray-500 text-sm max-w-xl mx-auto">Manage your trivia database and AI generation protocols from a unified dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/topics" className="group glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/20 transition-all shadow-xl hover:scale-[1.02]">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">Topic Areas</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Create, edit, and organize the various trivia domains available to players.</p>
            </div>
            <div className="flex items-center text-[10px] font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors uppercase">
              Manage Arenas →
            </div>
          </div>
        </Link>

        <Link href="/admin/questions" className="group glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/20 transition-all shadow-xl hover:scale-[1.02]">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">Intelligence Pool</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Generate new questions using AI or manage the existing data entries for each topic.</p>
            </div>
            <div className="flex items-center text-[10px] font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors uppercase">
              Manage Questions →
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
