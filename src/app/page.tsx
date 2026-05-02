'use client';

import React, { useState } from 'react';
import { createRoom, joinRoom } from '@/lib/actions';
import { ThemeToggle } from '@/components/ThemeToggle';

const TOPICS = [
  { id: 'history', name: 'History', icon: '📜' },
  { id: 'science', name: 'Science', icon: '🧪' },
  { id: 'pop-culture', name: 'Pop Culture', icon: '🎬' },
  { id: 'geography', name: 'Geography', icon: '🌍' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'custom', name: 'Custom', icon: '✨' },
];

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!nickname || !selectedTopic) return;
    
    setIsLoading(true);
    try {
      const topicToUse = selectedTopic === 'custom' ? customTopic : selectedTopic;
      const aiResponse = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicToUse }),
      });
      
      const aiData = await aiResponse.json();
      if (!aiData.questions) throw new Error('Failed to generate questions');

      const { room, player } = await createRoom(topicToUse, nickname, aiData.questions);
      
      localStorage.setItem('player_id', player.id);
      localStorage.setItem('player_name', nickname);
      
      window.location.href = `/room/${room.code}`;
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nickname || !roomCode) return;
    
    setIsLoading(true);
    try {
      const { room, player } = await joinRoom(roomCode, nickname);
      
      localStorage.setItem('player_id', player.id);
      localStorage.setItem('player_name', nickname);
      
      window.location.href = `/room/${room.code}`;
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Room not found or failed to join.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 page-transition">
      <div className="fixed top-8 right-8 z-50">
        <ThemeToggle />
      </div>

      {/* Decorative Background Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-white/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl w-full space-y-16 relative z-10">
        <header className="text-center space-y-4">
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-foreground uppercase italic animate-fade-in">
            Trivia<span className="text-gray-500 font-light not-italic">Duel</span>
          </h1>
          <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-sm sm:text-base">
            High-Stakes Real-Time Competition
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          {/* Identity & Creation */}
          <section className="glass p-8 sm:p-12 rounded-[2.5rem] space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Your Name</label>
              <input
                type="text"
                placeholder="Enter Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                disabled={isLoading}
                className="w-full glass-input rounded-xl px-6 h-10 text-base font-bold placeholder:text-gray-700 disabled:opacity-50"
              />
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic tracking-tight border-l-4 border-white pl-4">Start a Battle</h2>
              
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Select Domain</p>
                <div className="grid grid-cols-2 gap-3">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      disabled={isLoading}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-4 rounded-2xl text-left transition-all font-black text-sm glass-button flex items-center space-x-3 ${
                        selectedTopic === topic.id ? 'bg-white text-black border-white' : ''
                      } disabled:opacity-50`}
                    >
                      <span className="text-xl">{topic.icon}</span>
                      <span>{topic.name}</span>
                    </button>
                  ))}
                </div>
                {selectedTopic === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter Custom Topic..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    disabled={isLoading}
                    className="w-full glass-input rounded-xl px-6 h-10 text-sm font-bold animate-slide-up disabled:opacity-50"
                  />
                )}
              </div>

              <button
                disabled={!nickname || !selectedTopic || isLoading}
                onClick={handleCreateRoom}
                className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-20 font-black py-5 rounded-2xl transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase tracking-[0.2em] text-lg active:scale-95"
              >
                {isLoading ? 'Creating...' : 'Create Battle'}
              </button>
            </div>
          </section>

          {/* Join Match */}
          <section className="glass p-8 sm:p-12 rounded-[2.5rem] flex flex-col justify-between space-y-10">
            <div className="space-y-10">
              <h2 className="text-2xl font-black uppercase italic tracking-tight border-l-4 border-white pl-4">Join Battle</h2>
              
              <div className="space-y-4">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Room Code</label>
                <input
                  type="text"
                  placeholder="E.G. A1B2"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  disabled={isLoading}
                  className="w-full glass-input rounded-xl px-6 h-10 text-base focus:ring-0 placeholder:text-gray-800 uppercase font-black tracking-[0.5em] text-center disabled:opacity-50"
                />
              </div>
            </div>

            <button
              disabled={!nickname || !roomCode || isLoading}
              onClick={handleJoinRoom}
              className="w-full glass-button hover:bg-white hover:text-black disabled:opacity-20 font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-lg transition-all"
            >
              {isLoading ? 'Joining...' : 'Join Battle'}
            </button>
          </section>
        </div>

        <footer className="text-center">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[1.5em] opacity-50">
            Redis Distributed State Secure • Protocol v3.0
          </p>
        </footer>
      </div>
    </main>
  );
}
