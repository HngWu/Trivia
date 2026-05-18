import React from 'react';
import { Player } from '@/lib/types/game';
import { GlassButton } from '../shared/GlassButton';

interface WagerViewProps {
  roundData: {
    wager: number | null;
    wagerCount: number;
  };
  players: Player[];
  isLocked: boolean;
  usedWagers: number[];
  onSelectWager: (weight: number) => void;
  isLeader: boolean;
  onForceAdvance: (phase: string) => void;
}

export default function WagerView({ 
  roundData, 
  players, 
  isLocked, 
  usedWagers, 
  onSelectWager,
  isLeader,
  onForceAdvance
}: WagerViewProps) {
  // Add keyboard shortcuts for wagers
  React.useEffect(() => {
    if (isLocked || roundData.wager) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Map 1-9 to 1-9, and 0 to 10
      let val = parseInt(e.key);
      if (e.key === "0") val = 10;
      
      if (val >= 1 && val <= 10 && !usedWagers.includes(val)) {
        onSelectWager(val);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, roundData.wager, usedWagers, onSelectWager]);

  if (!roundData.wager) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto space-y-6 animate-slide-up text-center py-4">
        <div className="space-y-2">
           <p className="text-muted-foreground font-bold tracking-widest text-[9px] uppercase">Points at stake</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">How many points?</h2>
        </div>
        
         <div className="grid grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
            const isUsed = usedWagers.includes(weight);
            return (
              <GlassButton 
                key={weight} 
                disabled={isUsed || isLocked} 
                onClick={() => onSelectWager(weight)} 
                 className={`aspect-square p-6 sm:p-10 rounded-xl sm:rounded-3xl font-bold transition-all relative overflow-hidden group shadow-lg flex items-center justify-center focus:ring-2 focus:ring-white/20 focus:outline-none ${
                  isUsed || isLocked
                  ? "bg-transparent border-white/5 text-muted-foreground cursor-not-allowed" 
                   : "hover:border-white/30"
                }`}
              >
                <span className={`inline-block transition-all duration-500 will-change-transform ${
                  isUsed 
                    ? "line-through opacity-20 text-xl sm:text-2xl" 
                    : "text-xl sm:text-2xl group-hover:scale-[2] group-hover:-translate-y-1 group-hover:text-white"
                }`}>
                  {weight}
                </span>
                {!isUsed && !isLocked && (
                   <span className="absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{weight === 10 ? '0' : weight}]</span>
                )}
              </GlassButton>
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
              <p className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase">
              Waiting for others ({roundData.wagerCount}/{players.length})
            </p>
            <div className="h-1.5 w-56 bg-white/[0.03] rounded-full mx-auto overflow-hidden border border-white/[0.05]">
              <div 
                className="h-full bg-foreground transition-all duration-1000 ease-out" 
                style={{ width: `${(roundData.wagerCount / players.length) * 100}%` }}
              />
            </div>

            {isLeader && (
              <div className="pt-6 animate-fade-in w-full flex justify-center">
                <GlassButton 
                  onClick={() => onForceAdvance("question")}
                    className="min-w-[200px] py-4 rounded-xl font-bold tracking-widest uppercase focus:ring-2 focus:ring-white/20 focus:outline-none"
                >
                  Reveal Question
                </GlassButton>
              </div>
            )}
          </div>
       </div>
    </div>
  );
}
