'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  getDatabaseProviderStatus, 
  importFromSupabaseToSqlite,
  getRedisSessionStatus,
  setRedisSessionMode,
  testRedisPingAction,
  resetRedisBreakerAction
} from '@/lib/db/actions';
import { RedisStatus } from '@/lib/redis-breaker';
import Toast from '@/components/shared/Toast';
import { 
  Layers, 
  HelpCircle, 
  Users, 
  Database, 
  ArrowRight, 
  DownloadCloud, 
  Activity,
  Server,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff
} from 'lucide-react';

interface DatabaseStatus {
  provider: string;
  localStats: {
    topicsCount: number;
    questionsCount: number;
    usersCount?: number;
  };
}

export default function AdminDashboardClient({ 
  initialStatus,
  initialRedisStatus,
}: { 
  initialStatus: DatabaseStatus;
  initialRedisStatus?: RedisStatus;
}) {
  const [status, setStatus] = useState<DatabaseStatus>(initialStatus);
  const [redisStatus, setRedisStatus] = useState<RedisStatus>(initialRedisStatus || {
    mode: 'auto',
    health: 'healthy',
    isConfigured: true,
    consecutiveFailures: 0,
    lastFailureTime: 0,
    cooldownMs: 15000,
    isCircuitBreakerOpen: false,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [isPingingRedis, setIsPingingRedis] = useState(false);
  const [isUpdatingRedisMode, setIsUpdatingRedisMode] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStatus = () => {
    getDatabaseProviderStatus().then(setStatus);
    getRedisSessionStatus().then(setRedisStatus);
  };

  const handleToggleRedisMode = async () => {
    const nextMode = redisStatus.mode === 'fallback_only' ? 'auto' : 'fallback_only';
    setIsUpdatingRedisMode(true);
    try {
      await setRedisSessionMode(nextMode);
      const updated = await getRedisSessionStatus();
      setRedisStatus(updated);
      setToast(`Switched Redis engine to: ${nextMode === 'fallback_only' ? 'Force Local Fallback' : 'Auto Smart Failover'}`);
    } catch (err) {
      setToast(`Failed to update mode: ${(err as Error).message}`);
    } finally {
      setIsUpdatingRedisMode(false);
    }
  };

  const handleTestPing = async () => {
    setIsPingingRedis(true);
    try {
      const res = await testRedisPingAction();
      setPingResult(res);
      const updated = await getRedisSessionStatus();
      setRedisStatus(updated);
      if (res.success) {
        setToast(`Redis Online: Ping ${res.latencyMs}ms`);
      } else {
        setToast(`Redis Offline: ${res.error || 'Connection failed'}`);
      }
    } catch (err) {
      setToast(`Test failed: ${(err as Error).message}`);
    } finally {
      setIsPingingRedis(false);
    }
  };

  const handleResetBreaker = async () => {
    try {
      await resetRedisBreakerAction();
      const updated = await getRedisSessionStatus();
      setRedisStatus(updated);
      setPingResult(null);
      setToast('Circuit breaker reset successfully.');
    } catch (err) {
      setToast(`Reset failed: ${(err as Error).message}`);
    }
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

        {/* Session & Realtime State Card (Redis / Fallback Engine) */}
        <div className="md:col-span-2 glass p-8 rounded-[2.5rem] border-white/5 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground">
                  <Server className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Session &amp; Realtime Engine</h3>
                  <p className="text-xs text-gray-400">
                    Engine controlling active game rooms, live wagers, and multiplayer synchronization.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {redisStatus.mode === 'fallback_only' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Local Fallback Engine (Active)</span>
                  </span>
                ) : redisStatus.health === 'healthy' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Upstash Redis (Connected)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Fallback Active (Redis {redisStatus.health})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Explanatory description */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-gray-300 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-gray-400 font-semibold">Operating Mode: </span>
                  <span className="text-white font-mono font-bold">
                    {redisStatus.mode === 'fallback_only' ? 'Force Local Fallback Engine (0ms network overhead)' : 'Auto Smart Failover (Redis with Instant SQLite failover)'}
                  </span>
                </div>
                {pingResult && (
                  <div className="text-[11px] font-mono">
                    {pingResult.success ? (
                      <span className="text-emerald-400">Ping: {pingResult.latencyMs}ms</span>
                    ) : (
                      <span className="text-rose-400">Ping Error: {pingResult.error}</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {redisStatus.mode === 'fallback_only'
                  ? 'All server actions and game sync bypass Upstash Redis entirely. 100% of game state is stored in high-performance SQLite (WAL mode) and in-memory cache with sub-millisecond execution.'
                  : 'Upstash Redis is queried with a strict 150ms timeout. If unreachable or down, the shared circuit breaker immediately diverts all players to the local SQLite engine with zero stalling.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={handleToggleRedisMode}
              disabled={isUpdatingRedisMode}
              className={`py-3 px-4 rounded-xl text-xs font-bold tracking-wider flex items-center justify-center space-x-2 transition-all disabled:opacity-50 border ${
                redisStatus.mode === 'fallback_only'
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-foreground border-white/10'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{redisStatus.mode === 'fallback_only' ? 'Switch to Auto Mode' : 'Force Local Fallback'}</span>
            </button>

            <button
              onClick={handleTestPing}
              disabled={isPingingRedis}
              className="py-3 px-4 glass-button rounded-xl text-xs font-bold tracking-wider hover:bg-white/10 flex items-center justify-center space-x-2 text-foreground transition-all disabled:opacity-50"
            >
              {isPingingRedis ? (
                <span className="animate-pulse">Testing Ping...</span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Test Redis Connection</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetBreaker}
              className="py-3 px-4 glass-button rounded-xl text-xs font-bold tracking-wider hover:bg-white/10 flex items-center justify-center space-x-2 text-gray-300 hover:text-white transition-all"
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Reset Circuit Breaker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
