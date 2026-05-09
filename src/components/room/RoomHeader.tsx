import React from 'react';
import { GameState, Question } from '@/lib/types/game';

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
    <header className="w-full text-center space-y-2 mb-6 sm:mb-8 animate-fade-in">
      <div className="flex items-center justify-center space-x-3 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
         <span>Round {currentIndex + 1}</span>
         <span className="w-1 h-1 rounded-full bg-white/10"></span>
         <span>{topic || "General Knowledge"}</span>
         {(roomStatus !== displayStatus || isLocked) && (
           <>
             <span className="w-1 h-1 rounded-full bg-white/10"></span>
             <span className="text-foreground animate-pulse italic">Syncing...</span>
           </>
         )}
      </div>
      <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground drop-shadow-sm">
         {currentQuestion?.summary || "Get Ready"}
      </h2>
    </header>
  );
}
