import React from 'react';
import { Player } from '@/lib/types/game';
import BackgroundToggle from '../shared/BackgroundToggle';

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
    <nav className="glass sticky top-0 z-50 px-4 sm:px-8 py-2 sm:py-3 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-xl shadow-lg">
      <div className="flex items-center space-x-4 sm:space-x-6">
        <button onClick={onHome} className="text-foreground transition-all transform hover:scale-105">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-wider text-gray-600 uppercase">Score</span>
          <span className="text-lg font-bold tracking-tight text-foreground tabular-nums leading-none">
            {displayedMyPlayer?.score || 0}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto no-scrollbar max-w-[45vw] sm:max-w-none px-2">
        {displayedSortedPlayers.map((p, i) => (
          <div 
            key={p.id} 
            className={`px-3 py-1.5 rounded-xl text-[9px] font-bold border transition-all whitespace-nowrap ${
              p.id === myPlayerId 
                ? "bg-foreground text-background border-foreground shadow-md" 
                : "border-white/5 text-gray-500 bg-white/[0.02]"
            }`}
          >
            #{i + 1} {p.name.split(' ')[0]} • {p.score}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6">
         <BackgroundToggle />
         <div className="text-right hidden sm:block">
            <p className="text-[9px] text-gray-600 font-bold tracking-widest uppercase">Room</p>
            <p className="font-mono font-bold text-xs uppercase text-foreground">{roomCode}</p>
         </div>
      </div>
    </nav>
  );
}
