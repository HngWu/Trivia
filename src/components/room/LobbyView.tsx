import React from 'react';
import { Player } from '@/lib/types/game';

interface LobbyViewProps {
  topic: string;
  players: Player[];
  roomCode: string;
  myPlayerId: string;
  roomLeaderId: string | null;
  isLeader: boolean;
  isLocked: boolean;
  questionsCount: number;
  onKick: (id: string) => void;
  onStart: () => void;
  onCopy: () => void;
  copied: boolean;
}

export default function LobbyView({ 
  topic, 
  players, 
  roomCode, 
  myPlayerId, 
  roomLeaderId, 
  isLeader, 
  isLocked, 
  questionsCount, 
  onKick, 
  onStart, 
  onCopy, 
  copied 
}: LobbyViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-4">
      <div className="text-center space-y-3 mb-8">
        <div className="flex items-center justify-center space-x-3 text-[10px] font-bold tracking-widest text-gray-700 uppercase">
          <span>Selected Topic</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight capitalize text-gray-400">
          {topic || "General"}
        </h2>
      </div>
      
      <div className="glass p-5 sm:p-8 rounded-[2rem] w-full max-w-lg space-y-6 border-white/[0.03] shadow-xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
         <div className="flex justify-between items-center border-b border-white/[0.03] pb-4">
            <div className="flex flex-col">
              <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">Players joined ({players.length}/10)</p>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-[9px] font-bold text-gray-700 uppercase">Room:</span>
                <span className="text-xs font-bold text-foreground tracking-widest font-mono bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/5">{roomCode}</span>
              </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
         </div>
         <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
           {players.map(p => (
             <div key={p.id} className={`flex justify-between items-center p-3 sm:p-4 rounded-xl transition-all border ${p.id === myPlayerId ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/[0.03] hover:border-white/10'} text-foreground`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">{p.id === roomLeaderId ? "• " : ""}{p.name}</span>
                  {isLeader && p.id !== myPlayerId && (
                    <button 
                      disabled={isLocked}
                      onClick={() => onKick(p.id)}
                      className="text-[9px] text-red-500 font-bold uppercase tracking-wider hover:text-red-400 ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase opacity-40">{p.id === myPlayerId ? "You" : "Player"}</span>
             </div>
           ))}
         </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-6 w-full max-w-lg">
        <div className="w-full flex flex-col items-center space-y-3">
          {isLeader ? (
            <button 
              disabled={questionsCount === 0 || isLocked} 
              onClick={onStart} 
              className="w-full glass-button py-4 rounded-xl font-bold text-lg sm:text-xl bg-white/10 border-white/20"
            >
              {questionsCount === 0 ? "Loading questions..." : "Start game"}
            </button>
          ) : (
            <div className="glass px-6 py-3 rounded-xl animate-pulse border-white/5">
              <p className="text-gray-500 font-bold text-[10px] text-center italic">Waiting for host to start...</p>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center space-y-3">
          <p className="text-[9px] font-bold tracking-widest text-gray-700 uppercase">Invite others</p>
          <div className="glass flex items-center justify-between pl-5 pr-2 py-2 rounded-xl w-full border-white/[0.03] shadow-lg">
            <span className="text-xs font-mono text-white/40 truncate mr-4">
              {typeof window !== 'undefined' ? window.location.href : `.../room/${roomCode}`}
            </span>
            <button 
              onClick={onCopy}
              className="h-9 px-5 bg-white text-black hover:bg-gray-200 rounded-lg transition-all shadow-md group flex items-center space-x-2 shrink-0"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {copied ? "Copied" : "Copy"}
              </span>
              {!copied && (
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
