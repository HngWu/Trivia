import React from 'react';
import { Button, Input, TextField, Label } from "@heroui/react";

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
      <form onSubmit={handleSubmit} className="glass p-5 sm:p-6 rounded-2xl border-white/10 shadow-xl bg-transparent">
        <div className="flex flex-col gap-4 text-left">
          <TextField name="nickname" value={nickname} onChange={setNickname}>
            <Label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase mb-1.5 ml-1">Your Name</Label>
            <Input
              placeholder="Enter your name"
              className="glass !border-white/10 h-12 rounded-xl px-4 font-semibold"
            />
          </TextField>
          
          <div className="flex items-end gap-2 w-full">
            <div className="flex-1">
               <TextField name="roomCode" value={roomCode} onChange={val => setRoomCode(val.toUpperCase())}>
                 <Label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase mb-1.5 ml-1">Room Code</Label>
                 <Input
                   placeholder="CODE"
                   className="glass !border-white/10 h-12 rounded-xl px-4 font-bold tracking-widest uppercase"
                 />
               </TextField>
            </div>
            <Button 
              type="submit"
              isLoading={isLoading}
              disabled={isLoading || !nickname || !roomCode}
              className="h-12 px-6 rounded-xl font-bold bg-foreground text-background shrink-0"
            >
              Join
            </Button>
          </div>
        </div>
      </form>
      <button 
        onClick={onBack}
        className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground transition-colors w-full text-center mt-6"
      >
        ← Back to topics
      </button>
    </section>
  );
}
