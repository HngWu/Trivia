import React from 'react';
import { Player } from '@/lib/types/game';
import BackgroundToggle from '../shared/BackgroundToggle';
import { Button, Chip, ScrollShadow } from "@heroui/react";

interface RoomNavProps {
  roomCode: string;
  myPlayerId: string;
  displayedMyPlayer: Player | undefined;
  displayedSortedPlayers: Player[];
  onHome: () => void;
}

export default function RoomNav({ 
  roomCode, 
  myPlayerId, 
  displayedMyPlayer, 
  displayedSortedPlayers, 
  onHome 
}: RoomNavProps) {
  return (
    <nav className="glass sticky top-0 z-50 px-4 sm:px-8 py-2 sm:py-3 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-xl shadow-lg bg-transparent">
      <div className="flex items-center space-x-4 sm:space-x-6">
        <Button 
          variant="tertiary"
          isIconOnly
          onPress={onHome} 
          className="text-foreground transition-all min-w-0 h-auto p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Button>
        <BackgroundToggle />
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-wider text-gray-600 uppercase">Score</span>
          <span className="text-lg font-bold tracking-tight text-foreground tabular-nums leading-none">
            {displayedMyPlayer?.score || 0}
          </span>
        </div>
      </div>
      
      <ScrollShadow orientation="horizontal" className="flex items-center space-x-2 md:space-x-3 max-w-[40vw] sm:max-w-none px-2 no-scrollbar" hideScrollBar>
        {displayedSortedPlayers.map((p, i) => {
          // Calculate rank with tie handling
          const rank = i > 0 && p.score === displayedSortedPlayers[i - 1].score 
            ? displayedSortedPlayers.slice(0, i).findIndex(prev => prev.score === p.score) + 1
            : i + 1;
            
          return (
            <Chip 
              key={p.id} 
              size="sm"
              variant={p.id === myPlayerId ? "primary" : "soft"}
              className={`rounded-xl text-[9px] font-bold border-none transition-all whitespace-nowrap h-7 px-3 ${
                p.id === myPlayerId 
                  ? "bg-foreground text-background shadow-md" 
                  : "text-gray-500 bg-white/[0.02]"
              }`}
            >
              #{rank} {p.name.split(' ')[0]} • {p.score}
            </Chip>
          );
        })}
      </ScrollShadow>

      <div className="flex items-center space-x-4 sm:space-x-6">
         <div className="text-right hidden sm:block">
            <p className="text-[9px] text-gray-600 font-bold tracking-widest uppercase">Room</p>
            <p className="font-mono font-bold text-xs uppercase text-foreground">{roomCode}</p>
         </div>
      </div>
    </nav>
  );
}
