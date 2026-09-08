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
      <div className="w-full flex flex-col items-center justify-center max-w-3xl mx-auto animate-slide-up text-center pt-20 sm:pt-28 md:pt-32 pb-6 px-2 sm:px-4">
        {/* Header - Flowed naturally with generous top clearance below RoomHeader */}
        <div className="space-y-1 mb-6 sm:mb-10">
          <p className="text-muted-foreground font-bold tracking-widest text-[10px] sm:text-xs uppercase">Points at stake</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">How many points?</h2>
        </div>
        
        {/* Grid Container - Clean 5-column grid that fits mobile without clipping */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="grid grid-cols-5 gap-2.5 sm:gap-4 md:gap-5 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
              const isUsed = usedWagers.includes(weight);
              return (
                <GlassButton 
                  key={weight} 
                  disabled={isUsed || isLocked} 
                  onClick={() => onSelectWager(weight)} 
                  className={`aspect-square p-2.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl font-bold transition-all relative overflow-hidden group shadow-lg flex items-center justify-center focus:ring-2 focus:ring-white/20 focus:outline-none ${
                    isUsed || isLocked
                    ? "bg-transparent border-white/5 text-muted-foreground cursor-not-allowed" 
                    : "hover:border-white/30 active:scale-95"
                  }`}
                >
                  <span className={`inline-block transition-all duration-300 will-change-transform ${
                    isUsed 
                      ? "line-through opacity-20 text-lg sm:text-2xl md:text-3xl" 
                      : "text-lg sm:text-2xl md:text-3xl group-hover:scale-110 group-hover:text-white"
                  }`}>
                    {weight}
                  </span>
                  {!isUsed && !isLocked && (
                    <span className="hidden sm:inline-block absolute bottom-1 right-2 text-[9px] opacity-0 group-hover:opacity-40 transition-opacity font-mono">[{weight === 10 ? '0' : weight}]</span>
                  )}
                </GlassButton>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center max-w-xl mx-auto animate-fade-in text-center pt-20 sm:pt-28 md:pt-32 pb-6 px-4 space-y-8">
      <div className="inline-block px-6 sm:px-8 py-3.5 sm:py-4 glass border-white/10 rounded-2xl shadow-xl relative overflow-hidden">
        <p className="text-foreground text-xl sm:text-3xl font-bold tracking-tight animate-pulse italic">
          Point stake locked ({roundData.wager} pts)
        </p>
      </div>

      <div className="space-y-4 w-full">
        <p className="text-muted-foreground font-bold text-[10px] sm:text-xs tracking-widest uppercase">
          Waiting for players ({roundData.wagerCount}/{players.length})
        </p>
        <div className="h-2 w-56 sm:w-72 bg-white/[0.05] rounded-full mx-auto overflow-hidden border border-white/[0.08]">
          <div 
            className="h-full bg-foreground transition-all duration-500 ease-out" 
            style={{ width: `${Math.min(100, (roundData.wagerCount / Math.max(1, players.length)) * 100)}%` }}
          />
        </div>

        {isLeader && (
          <div className="pt-6 animate-fade-in w-full flex justify-center">
            <GlassButton 
              onClick={() => onForceAdvance("question")}
              className="min-w-[200px] py-3.5 px-6 rounded-xl font-bold tracking-widest uppercase text-sm focus:ring-2 focus:ring-white/20 focus:outline-none"
            >
              Reveal Question
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
}
