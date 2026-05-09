import React from 'react';
import { Answer, Player } from '@/lib/types/game';

interface WagerViewProps {
  roundData: {
    wager: number | null;
    wagerCount: number;
  };
  players: Player[];
  isLocked: boolean;
  usedWagers: number[];
  onSelectWager: (weight: number) => void;
}

export default function WagerView({ 
  roundData, 
  players, 
  isLocked, 
  usedWagers, 
  onSelectWager 
}: WagerViewProps) {
  if (!roundData.wager) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-slide-up text-center py-4">
        <div className="space-y-1.5">
          <p className="text-gray-600 font-bold tracking-widest text-[9px] uppercase">Points at stake</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">How many points?</h2>
        </div>
        
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
            const isUsed = usedWagers.includes(weight);
            return (
              <button 
                key={weight} 
                disabled={isUsed || isLocked} 
                onClick={() => onSelectWager(weight)} 
                className={`h-16 sm:h-24 rounded-xl sm:rounded-2xl font-bold text-2xl sm:text-4xl transition-all border-2 relative overflow-hidden group shadow-lg ${
                  isUsed || isLocked
                  ? "bg-transparent border-white/5 text-gray-900 cursor-not-allowed" 
                  : "glass hover:bg-foreground hover:text-background hover:border-foreground active:scale-95"
                }`}
              >
                <span className={isUsed ? "line-through opacity-20" : ""}>{weight}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8 py-8">
       <div className="text-center space-y-8">
          <div className="inline-block px-8 py-4 glass border-white/10 rounded-2xl shadow-xl relative overflow-hidden">
             <p className="text-foreground text-2xl sm:text-4xl font-bold tracking-tight animate-pulse italic">Point stake locked</p>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600 font-bold text-[10px] tracking-widest uppercase">
              Waiting for others ({roundData.wagerCount}/{players.length})
            </p>
            <div className="h-1.5 w-56 bg-white/[0.03] rounded-full mx-auto overflow-hidden border border-white/[0.05]">
              <div 
                className="h-full bg-foreground transition-all duration-1000 ease-out" 
                style={{ width: `${(roundData.wagerCount / players.length) * 100}%` }}
              />
            </div>
          </div>
       </div>
    </div>
  );
}
