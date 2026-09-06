'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getDatabaseProviderStatus, importFromSupabaseToSqlite } from '@/lib/db/actions';
import Toast from '@/components/shared/Toast';
import { 
  Layers, 
  HelpCircle, 
  Users, 
  Database, 
  ArrowRight, 
  DownloadCloud, 
  Activity 
} from 'lucide-react';

interface DatabaseStatus {
  provider: string;
  localStats: {
    topicsCount: number;
    questionsCount: number;
    usersCount?: number;
  };
}

export default function AdminDashboardClient({ initialStatus }: { initialStatus: DatabaseStatus }) {
  const [status, setStatus] = useState<DatabaseStatus>(initialStatus);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStatus = () => {
    getDatabaseProviderStatus().then(setStatus);
  };

  const handleImport = async () => {
    if (!confirm('This will import all topics and questions from Supabase into your local SQLite database. Proceed?')) {
      return;
    }
    setIsImporting(true);
    try {
      const res = await importFromSupabaseToSqlite();
      setToast(res.message);
      fetchStatus();
    } catch (error) {
      const err = error as Error;
      setToast(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-5xl mx-auto py-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>Control Center Operational</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">Command Center</h2>
        <p className="text-gray-500 text-xs sm:text-sm max-w-xl mx-auto">
          Monitor your trivia database, manage intelligence domains, and oversee administrator permissions from a unified control deck.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Topics Card */}
        <Link 
          href="/admin/topics" 
          className="group glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/20 transition-all shadow-xl hover:scale-[1.02] flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground group-hover:bg-white group-hover:text-black transition-all">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground">Knowledge Arenas</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-mono text-gray-300 font-bold">
                  {status?.localStats.topicsCount ?? 0} Arenas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Create, customize, and organize the knowledge categories available for duel matches.
              </p>
            </div>
          </div>
          <div className="flex items-center text-[10px] font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors uppercase pt-6">
            <span>Manage Arenas</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Questions Card */}
        <Link 
          href="/admin/questions" 
          className="group glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/20 transition-all shadow-xl hover:scale-[1.02] flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground group-hover:bg-white group-hover:text-black transition-all">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground">Intelligence Pool</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-mono text-gray-300 font-bold">
                  {status?.localStats.questionsCount ?? 0} Questions
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Generate high-difficulty trivia with AI, filter by arena, and manage individual challenge items.
              </p>
            </div>
          </div>
          <div className="flex items-center text-[10px] font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors uppercase pt-6">
            <span>Inspect Pool</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Admins Card */}
        <Link 
          href="/admin/users" 
          className="group glass p-8 rounded-[2.5rem] border-white/5 hover:border-white/20 transition-all shadow-xl hover:scale-[1.02] flex flex-col justify-between"
        >
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground group-hover:bg-white group-hover:text-black transition-all">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground">Administrators</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-mono text-gray-300 font-bold">
                  {status?.localStats.usersCount ?? 1} Admin{(status?.localStats.usersCount ?? 1) === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Add, modify, or remove administrator credentials with salted PBKDF2 cryptography.
              </p>
            </div>
          </div>
          <div className="flex items-center text-[10px] font-bold tracking-widest text-gray-400 group-hover:text-white transition-colors uppercase pt-6">
            <span>Manage Admins</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Database Engine Card */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground">Database Engine</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {status?.provider === 'sqlite' ? 'SQLite (Active)' : 'Supabase (Active)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Local repository contains <span className="text-white font-semibold">{status?.localStats.topicsCount ?? 0}</span> arenas and <span className="text-white font-semibold">{status?.localStats.questionsCount ?? 0}</span> questions.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full py-3 px-4 glass-button rounded-xl text-xs font-bold tracking-wider hover:bg-white/10 flex items-center justify-center space-x-2 text-foreground transition-all disabled:opacity-50"
            >
              {isImporting ? (
                <span className="animate-pulse">Importing...</span>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Sync &amp; Import from Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
