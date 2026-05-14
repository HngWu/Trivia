import React from 'react';
import { Player } from '@/lib/types/game';
import { Button, ProgressBar, Card } from "@heroui/react";

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
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-slide-up text-center py-4">
        <div className="space-y-1.5">
          <p className="text-gray-600 font-bold tracking-widest text-[9px] uppercase">Points at stake</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">How many points?</h2>
        </div>
        
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
            const isUsed = usedWagers.includes(weight);
            return (
              <Button 
                key={weight} 
                isDisabled={isUsed || isLocked} 
                onPress={() => onSelectWager(weight)} 
                className={`h-16 sm:h-24 rounded-xl sm:rounded-2xl font-bold text-2xl sm:text-4xl transition-all border-2 relative overflow-hidden group shadow-lg min-w-0 p-0 ${
                  isUsed || isLocked
                  ? "bg-transparent border-white/5 text-gray-900 cursor-not-allowed" 
                  : "glass-button !border-white/10 hover:!border-white/30"
                }`}
              >
                <span className={isUsed ? "line-through opacity-20" : ""}>{weight}</span>
                {!isUsed && !isLocked && (
                   <span className="absolute bottom-1 right-2 text-[8px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{weight === 10 ? '0' : weight}]</span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in space-y-8 py-8">
       <div className="text-center space-y-8">
          <Card className="inline-block px-8 py-4 glass border-white/10 rounded-2xl shadow-xl relative overflow-hidden bg-transparent">
             <p className="text-foreground text-2xl sm:text-4xl font-bold tracking-tight animate-pulse italic">Point stake locked</p>
          </Card>
          <div className="space-y-4">
            <p className="text-gray-600 font-bold text-[10px] tracking-widest uppercase">
              Waiting for others ({roundData.wagerCount}/{players.length})
            </p>
            <ProgressBar 
              size="sm"
              value={(roundData.wagerCount / players.length) * 100}
              className="max-w-md mx-auto"
              aria-label="Wager progress"
            >
              <ProgressBar.Track className="bg-white/[0.03] border border-white/[0.05]">
                <ProgressBar.Fill className="bg-foreground" />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
       </div>
    </div>
  );
}
