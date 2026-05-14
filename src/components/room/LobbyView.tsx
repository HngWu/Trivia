import React from 'react';
import { Player } from '@/lib/types/game';
import { Button, Card, Separator, Chip, Spinner, TextField, Label, InputGroup } from "@heroui/react";

interface LobbyViewProps {
  topic: string;
  players: Player[];
  roomCode: string;
  myPlayerId: string;
  roomLeaderId: string | null;
  isLeader: boolean;
  isLocked: boolean;
  questionsCount: number;
  onKick: (id: string) => void;
  onStart: () => void;
  onCopy: () => void;
  copied: boolean;
}

export default function LobbyView({ 
  topic, 
  players, 
  roomCode, 
  myPlayerId, 
  roomLeaderId, 
  isLeader, 
  isLocked, 
  questionsCount, 
  onKick, 
  onStart, 
  onCopy, 
  copied 
}: LobbyViewProps) {
  // Add keyboard shortcut for leader to start game
  React.useEffect(() => {
    if (!isLeader || questionsCount === 0 || isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLeader, questionsCount, isLocked, onStart]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-4">
      <div className="text-center space-y-3 mb-4">
        <div className="flex items-center justify-center space-x-3 text-[10px] font-bold tracking-widest text-gray-700 uppercase">
          <span>Selected Topic</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight capitalize text-gray-400">
          {topic || "General"}
        </h2>
      </div>
      
      <Card className="glass p-4 sm:p-6 rounded-[2rem] w-full max-w-lg space-y-6 border-white/[0.03] shadow-xl relative overflow-visible bg-transparent">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
         <div className="flex justify-between items-center pb-2">
            <div className="flex flex-col">
              <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">Players joined ({players.length}/10)</p>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-[9px] font-bold text-gray-700 uppercase">Room:</span>
                <span className="text-xs font-bold text-foreground tracking-widest font-mono bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/5">{roomCode}</span>
              </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
         </div>
         <Separator className="bg-white/[0.05]" />
         <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar py-2">
           {players.map(p => (
             <Card 
               key={p.id} 
               className={`flex-row justify-between items-center p-3 sm:p-4 rounded-xl transition-all border shadow-none bg-transparent ${
                 p.id === myPlayerId ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/[0.03] hover:border-white/10'
               }`}
             >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-foreground">
                    {p.id === roomLeaderId && <span className="text-gray-500 mr-1.5">★</span>}
                    {p.name}
                  </span>
                  {isLeader && p.id !== myPlayerId && (
                    <Button 
                      size="sm"
                      variant="light"
                      color="danger"
                      disabled={isLocked}
                      onPress={() => onKick(p.id)}
                      className="text-[9px] font-bold uppercase tracking-wider h-auto min-w-0 p-1"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Chip 
                  size="sm" 
                  variant="soft" 
                  className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 border-none"
                >
                  {p.id === myPlayerId ? "You" : "Player"}
                </Chip>
             </Card>
           ))}
         </div>
      </Card>
      
      <div className="mt-8 flex flex-col items-center space-y-6 w-full max-w-lg">
        <div className="w-full flex flex-col items-center space-y-3">
          {isLeader ? (
            <Button 
              disabled={questionsCount === 0 || isLocked} 
              onPress={onStart} 
              className="w-full h-12 sm:h-14 rounded-2xl font-bold text-lg bg-white/10 border-white/20 text-foreground glass focus:ring-2 focus:ring-white/20 focus:outline-none"
            >
              {(questionsCount === 0 || isLocked) && <Spinner size="sm" color="current" className="mr-2" />}
              {questionsCount === 0 ? "Loading questions..." : "Start game"}
            </Button>
          ) : (
            <div className="glass px-6 py-3 rounded-xl animate-pulse border-white/5">
              <p className="text-gray-500 font-bold text-[10px] text-center italic">Waiting for host to start...</p>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center space-y-3 text-left">
          <TextField aria-label="Invite others" fullWidth>
            <Label className="text-[9px] font-bold tracking-widest text-gray-700 uppercase mb-1 ml-1">Invite others</Label>
            <InputGroup fullWidth className="glass !border-white/10 h-14 rounded-xl shadow-lg overflow-hidden">
              <InputGroup.Input 
                readOnly
                value={typeof window !== 'undefined' ? window.location.href : `.../room/${roomCode}`}
                className="text-xs font-mono text-white/40 truncate bg-transparent border-none outline-none"
              />
              <InputGroup.Suffix className="pr-1 bg-transparent">
                <Button 
                  onPress={onCopy}
                  size="sm"
                  className="h-10 px-6 bg-white text-black font-bold uppercase tracking-wider rounded-lg shadow-md shrink-0"
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </div>
      </div>
    </div>
  );
}
