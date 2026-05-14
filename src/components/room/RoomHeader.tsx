import React from 'react';
import { GameState, Question } from '@/lib/types/game';
import { Chip } from "@heroui/react";

interface RoomHeaderProps {
  currentIndex: number;
  topic: string;
  roomStatus: GameState;
  displayStatus: GameState;
  isLocked: boolean;
  currentQuestion: Question | undefined;
}

export default function RoomHeader({ 
  currentIndex, 
  topic, 
  roomStatus, 
  displayStatus, 
  isLocked, 
  currentQuestion 
}: RoomHeaderProps) {
  if (displayStatus === "waiting" || displayStatus === "final") return null;

  return (
    <header className="w-full text-center space-y-3 mb-6 sm:mb-8 animate-fade-in">
      <div className="flex items-center justify-center gap-2">
         <Chip 
           size="sm" 
           variant="soft" 
           className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-none"
         >
           Round {currentIndex + 1}
         </Chip>
         <Chip 
           size="sm" 
           variant="soft" 
           className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-none"
         >
           {topic || "General Knowledge"}
         </Chip>
         {(roomStatus !== displayStatus || isLocked) && (
           <Chip 
             size="sm" 
             variant="soft" 
             color="accent"
             className="bg-foreground/10 text-[9px] font-bold uppercase tracking-widest text-foreground animate-pulse border-none italic"
           >
             Syncing...
           </Chip>
         )}
      </div>
      <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground drop-shadow-sm">
         {currentQuestion?.summary || "Get Ready"}
      </h2>
    </header>
  );
}
