import React from 'react';
import { Player, GameState } from '@/lib/types/game';
import BackgroundToggle from '../shared/BackgroundToggle';

interface RoomNavProps {
  roomCode: string;
  myPlayerId: string;
  displayedMyPlayer: Player | undefined;
  displayedSortedPlayers: Player[];
  onHome: () => void;
  displayStatus?: GameState;
}

export default function RoomNav({ 
  roomCode, 
  myPlayerId, 
  displayedMyPlayer, 
  displayedSortedPlayers, 
  onHome,
  displayStatus
}: RoomNavProps) {
  const isWaiting = displayStatus === 'waiting';

  return (
    <nav className="glass sticky top-0 z-50 px-4 sm:px-8 py-2 sm:py-3 flex justify-between items-center border-x-0 border-t-0 rounded-none backdrop-blur-xl shadow-lg min-h-[4rem] sm:min-h-[5rem]">
      <div className="flex items-center space-x-4 sm:space-x-6 flex-1">
        <button onClick={onHome} className="text-foreground transition-all transform hover:scale-105">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <BackgroundToggle />
        {!isWaiting && (
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-wider text-gray-600 uppercase">Score</span>
            <span className="text-lg font-bold tracking-tight text-foreground tabular-nums leading-none">
              {displayedMyPlayer?.score || 0}
            </span>
          </div>
        )}
      </div>
      
      {!isWaiting && (
        <div className="flex-[2] flex items-center justify-center md:justify-center overflow-x-auto no-scrollbar px-2 mx-2 py-4">
          <div className="flex items-center space-x-2 md:space-x-4 flex-nowrap">
            {displayedSortedPlayers.map((p, i) => {
              // Calculate rank with tie handling
              const rank = i > 0 && p.score === displayedSortedPlayers[i - 1].score 
                ? displayedSortedPlayers.slice(0, i).findIndex(prev => prev.score === p.score) + 1
                : i + 1;
                
              return (
                <div 
                  key={p.id} 
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap glass shadow-md border ${
                    p.id === myPlayerId 
                      ? "border-white/20 shadow-white/5 scale-110 z-10" 
                      : "border-white/5 text-gray-500 opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="opacity-30 mr-1.5 font-mono">#{rank}</span>
                  <span className={p.id === myPlayerId ? "text-foreground" : ""}>{p.name.split(' ')[0]}</span>
                  <span className="mx-1.5 opacity-10">|</span>
                  <span className="text-foreground tabular-nums">{p.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex items-center space-x-4 sm:space-x-6 justify-end ${isWaiting ? 'flex-1' : 'flex-1'}`}>
         <div className="text-right hidden sm:block">
            <p className="text-[9px] text-gray-600 font-bold tracking-widest uppercase">Room</p>
            <p className="font-mono font-bold text-xs uppercase text-foreground">{roomCode}</p>
         </div>
      </div>
    </nav>
  );
}
