'use client';

import React, { useState } from 'react';
import { createRoom, joinRoom } from '@/lib/actions';
import Toast from '@/components/Toast';

const TOPICS = [
// ... (keep TOPICS as is)
  { 
    id: 'history', 
    name: 'History', 
    icon: '📜', 
    description: 'Travel through time and test your knowledge of ancient civilizations, world wars, and historical figures.',
    exampleQuestion: 'Who was the first emperor of Rome?'
  },
  { 
    id: 'science', 
    name: 'Science', 
    icon: '🧪', 
    description: 'Explore the mysteries of the universe, from biology and chemistry to physics and astronomy.',
    exampleQuestion: 'What is the chemical symbol for Gold?'
  },
  { 
    id: 'pop-culture', 
    name: 'Pop Culture', 
    icon: '🎬', 
    description: 'Movies, music, celebrities, and trends. Stay up to date with the latest and greatest in entertainment.',
    exampleQuestion: 'Which movie won the first ever Oscar for Best Picture?'
  },
  { 
    id: 'geography', 
    name: 'Geography', 
    icon: '🌍', 
    description: 'Discover the world! From mountain ranges and rivers to countries and capitals.',
    exampleQuestion: 'Which country has the most natural lakes?'
  },
  { 
    id: 'sports', 
    name: 'Sports', 
    icon: '⚽', 
    description: 'For the ultimate fans. Test your knowledge on teams, athletes, and legendary sports moments.',
    exampleQuestion: 'Which athlete has won the most Olympic gold medals?'
  },
  { 
    id: 'badminton', 
    name: 'Badminton', 
    icon: '🏸', 
    description: 'Smash your way through history, rules, and legendary players like Lin Dan and Lee Chong Wei.',
    exampleQuestion: 'How many feathers are in a standard shuttlecock?'
  },
  { 
    id: 'mobile legends', 
    name: 'Mobile Legends', 
    icon: '🎮', 
    description: 'Welcome to the Land of Dawn! Test your knowledge on heroes, items, and epic MLBB esports moments.',
    exampleQuestion: 'Which hero is known as the "Son of the Dragon"?'
  },
  { 
    id: 'wild rift', 
    name: 'Wild Rift', 
    icon: '💎', 
    description: 'Master the Rift! Test your knowledge on LoL: Wild Rift champions, runes, and tactical teamplay.',
    exampleQuestion: 'Which champion has the ultimate ability "Enchanted Crystal Arrow"?'
  },
  { 
    id: 'custom', 
    name: 'Custom', 
    icon: '✨', 
    description: 'Want something specific? Type in any topic and our AI will generate a unique battle for you.',
    exampleQuestion: 'E.g., 90s Hip Hop, Quantum Mechanics, or Cooking Basics.'
  },
];

export default function Home() {
  const [nickname, setNickname] = React.useState('');
  const [roomCode, setRoomCode] = React.useState('');
  const [selectedTopic, setSelectedTopic] = React.useState('');
  const [customTopic, setCustomTopic] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showJoinInput, setShowJoinInput] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedName = localStorage.getItem('player_name');
    if (savedName) {
      setNickname(savedName);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleCreateRoom = async () => {
    if (isLoading || !nickname || !selectedTopic) return;
    if (selectedTopic === 'custom' && !customTopic) return;
    
    setIsLoading(true);
    try {
      const topicToUse = selectedTopic === 'custom' ? customTopic : selectedTopic;
      const { room, player } = await createRoom(topicToUse, nickname);
      
      localStorage.setItem('player_id', player.id);
      localStorage.setItem('player_name', nickname);
      
      window.location.href = `/room/${room.code}`;
    } catch (error) {
      console.error('Error creating room:', error);
      showToast('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (isLoading || !nickname || !roomCode) {
      showToast('Please enter both your name and a room code.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { room, player } = await joinRoom(roomCode, nickname);
      
      localStorage.setItem('player_id', player.id);
      localStorage.setItem('player_name', nickname);
      
      window.location.href = `/room/${room.code}`;
    } catch (error) {
      console.error('Error joining room:', error);
      showToast('Room not found or failed to join.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTopicData = TOPICS.find(t => t.id === selectedTopic);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 page-transition overflow-y-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="max-w-4xl w-full space-y-12 relative z-10 py-12">
        <header className={`text-center space-y-4 ${selectedTopic ? 'hidden md:block' : ''}`}>
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-foreground uppercase italic animate-fade-in">
            Trivia<span className="text-gray-500 font-light not-italic">Duel</span>
          </h1>
          <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-[10px] sm:text-xs">
            High-Stakes Real-Time Competition
          </p>
        </header>

        {/* Top Section: Join Battle */}
        <section className={`w-full max-w-md mx-auto space-y-4 text-center ${selectedTopic ? 'hidden md:block' : ''}`}>
          {!showJoinInput ? (
            <button 
              onClick={() => setShowJoinInput(true)}
              className="glass-button px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-white hover:text-black transition-all active:scale-95"
            >
              Join a Battle
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in glass p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white placeholder:text-gray-700"
                />
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="flex-1 h-10 glass-input rounded-xl px-4 font-black tracking-widest placeholder:text-gray-700 uppercase"
                  />
                  <button 
                    onClick={handleJoinRoom}
                    disabled={isLoading}
                    className="h-10 glass-button px-6 rounded-xl font-black uppercase text-sm whitespace-nowrap"
                  >
                    Join
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowJoinInput(false)}
                className="text-[10px] uppercase font-black tracking-widest opacity-50 hover:opacity-100 transition-opacity"
              >
                Back to Creation
              </button>
            </div>
          )}
        </section>

        {/* Middle Section: Category Grid */}
        {!showJoinInput && (
          <section className={`w-full max-w-4xl mx-auto space-y-6 ${selectedTopic ? 'hidden md:block' : ''}`}>
            <h2 className="text-center text-xs font-black uppercase tracking-[0.4em] text-gray-500">Select Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`group relative p-4 sm:p-6 glass rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 border border-white/5 hover:border-white/20 ${
                    selectedTopic === topic.id 
                      ? 'border-white bg-white/10 scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.1)]' 
                      : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Selection Indicator */}
                  {selectedTopic === topic.id && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                  )}
                  
                  <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-300">{topic.icon}</span>
                  <span className="font-black uppercase tracking-[0.2em] text-xs text-white">{topic.name}</span>
                  
                  <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Section: Selection View (Dynamic) */}
        {!showJoinInput && selectedTopicData && (
          <section className="glass w-full max-w-2xl mx-auto p-8 sm:p-10 rounded-[2.5rem] animate-slide-up space-y-8 border-white/20">
            <button 
              onClick={() => setSelectedTopic('')}
              className="md:hidden flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-50 hover:opacity-100 mb-2"
            >
              ← Back to Categories
            </button>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{selectedTopicData.icon}</span>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">{selectedTopicData.name}</h3>
              </div>
              <p className="text-sm leading-relaxed font-medium">
                {selectedTopicData.description}
              </p>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-50 block">Example Question</span>
              <p className="italic text-white font-medium text-lg leading-snug">
                &quot;{selectedTopicData.exampleQuestion}&quot;
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTopic === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Topic</label>
                    <input
                      type="text"
                      placeholder="Enter Topic (e.g. 80s Rock)"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white placeholder:text-gray-700"
                    />
                  </div>
                )}
                <div className={`space-y-2 ${selectedTopic !== 'custom' ? 'sm:col-span-2' : ''}`}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter Nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white placeholder:text-gray-700"
                  />
                </div>
              </div>

              <button
                disabled={!nickname || (selectedTopic === 'custom' && !customTopic) || isLoading}
                onClick={handleCreateRoom}
                className="w-full glass-button py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-lg hover:bg-white hover:text-black disabled:opacity-20 active:scale-[0.98] transition-all"
              >
                {isLoading ? 'Generating Battle...' : 'Create Battle'}
              </button>
            </div>
          </section>
        )}

        <footer className="text-center pt-8">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[1.5em] opacity-30">
            Redis Distributed State Secure • Protocol v3.0
          </p>
        </footer>
      </div>
    </main>
  );
}
