import React from 'react';
import { Player } from '@/lib/types/game';

interface FinalViewProps {
  sortedPlayers: Player[];
  myPlayerId: string;
  onHome: () => void;
}

export default function FinalView({ sortedPlayers, myPlayerId, onHome }: FinalViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-8">
      <h2 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight mb-8 sm:mb-12">Final Rankings</h2>
      
      <div className="glass w-full max-w-2xl rounded-[2rem] border-white/[0.03] overflow-hidden shadow-2xl">
        {sortedPlayers.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between p-5 sm:p-8 transition-all ${i === 0 ? "bg-white/[0.05] border-b border-white/10" : "border-b border-white/[0.02] last:border-0"}`}>
             <div className="flex items-center space-x-4 sm:space-x-8">
                <span className={`text-3xl sm:text-5xl font-bold italic tabular-nums ${i === 0 ? "text-foreground" : "text-foreground/10"}`}>
                  #{i + 1}
                </span>
                <div className="text-left">
                  <p className="text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground">{p.name}</p>
                  <p className="text-[9px] font-bold tracking-wider text-foreground/30 uppercase">{p.id === myPlayerId ? "You" : "Player"}</p>
                </div>
             </div>
             <span className="text-3xl sm:text-5xl font-bold tabular-nums text-foreground">{p.score}</span>
          </div>
        ))}
      </div>
      
      <button onClick={onHome} className="mt-12 sm:mt-16 glass-button px-12 sm:px-20 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 bg-white/5 border-white/10 hover:bg-foreground hover:text-background">
        Leave game
      </button>
    </div>
  );
}
