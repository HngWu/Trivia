import React from 'react';
import { motion } from 'framer-motion';

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
    <motion.section 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-md mx-auto space-y-4"
    >
      <form onSubmit={handleSubmit} className="glass p-5 sm:p-6 rounded-2xl border-white/10 shadow-xl">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Your Name"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 font-semibold text-base text-foreground focus:ring-2 focus:ring-white/10"
          />
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              required
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 min-w-0 h-10 glass-input rounded-xl px-4 font-bold tracking-widest uppercase text-base text-foreground focus:ring-2 focus:ring-white/10"
            />
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={isLoading || !nickname || !roomCode}
              className="h-10 glass-button px-6 rounded-xl font-bold text-sm whitespace-nowrap bg-foreground text-background shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
              Join
            </motion.button>
          </div>
        </div>
      </form>
      <button 
        onClick={onBack}
        className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground transition-colors w-full text-center mt-6"
      >
        ← Back to topics
      </button>
    </motion.section>
  );
}
