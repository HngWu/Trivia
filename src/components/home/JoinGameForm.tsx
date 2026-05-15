import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GlassButton } from '../shared/GlassButton';

interface JoinGameFormProps {
  nickname: string;
  setNickname: (val: string) => void;
  roomCode: string;
  setRoomCode: (val: string) => void;
  onJoin: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function JoinGameForm({ 
  nickname, 
  setNickname, 
  roomCode, 
  setRoomCode, 
  onJoin, 
  onBack, 
  isLoading 
}: JoinGameFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && nickname && roomCode) {
      onJoin();
    }
  };

  return (
    <section className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="text-center space-y-2 mb-2">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground drop-shadow-sm">
          Join Game
        </h2>
        <p className="text-gray-500 font-bold tracking-widest text-[10px] uppercase">Enter a room code to play</p>
      </div>
      <Card className="glass border-white/10 shadow-xl overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="text"
              required
              placeholder="Your Name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-10 rounded-xl px-4 font-semibold text-base bg-white/5 border-white/10 text-foreground placeholder:text-gray-500"
            />
            <div className="flex items-center gap-2 w-full">
              <Input
                type="text"
                required
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-0 h-10 rounded-xl px-4 font-bold tracking-widest uppercase text-base bg-white/5 border-white/10 text-foreground placeholder:text-gray-500"
              />
              <GlassButton 
                type="submit"
                disabled={isLoading || !nickname || !roomCode}
                className="h-10 px-5 rounded-xl font-bold text-sm whitespace-nowrap shrink-0"
              >
                Join
              </GlassButton>
            </div>
          </form>
        </CardContent>
      </Card>
      <button 
        onClick={onBack}
        className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground transition-colors w-full text-center mt-6"
      >
        ← Back to topics
      </button>
    </section>
  );
}
