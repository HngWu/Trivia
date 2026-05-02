'use client';

import React, { useState } from 'react';
import { createRoom, joinRoom } from '@/lib/actions';

const TOPICS = [
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
    id: 'custom', 
    name: 'Custom', 
    icon: '✨', 
    description: 'Want something specific? Type in any topic and our AI will generate a unique battle for you.',
    exampleQuestion: 'E.g., 90s Hip Hop, Quantum Mechanics, or Cooking Basics.'
  },
];

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  const handleCreateRoom = async () => {
    if (!nickname || !selectedTopic) return;
    if (selectedTopic === 'custom' && !customTopic) return;
    
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
    if (!nickname || !roomCode) {
      alert('Please enter both your name and a room code.');
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
      alert('Room not found or failed to join.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTopicData = TOPICS.find(t => t.id === selectedTopic);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 page-transition overflow-y-auto">
      {/* Decorative Background Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-white/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl w-full space-y-12 relative z-10 py-12">
        <header className="text-center space-y-4">
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter text-foreground uppercase italic animate-fade-in">
            Trivia<span className="text-gray-500 font-light not-italic">Duel</span>
          </h1>
          <p className="text-gray-500 font-medium tracking-[0.2em] uppercase text-sm sm:text-base">
            High-Stakes Real-Time Competition
          </p>
        </header>

        {/* Top Section: Join Battle */}
        <section className="w-full max-w-md mx-auto space-y-4 text-center">
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
                  className="w-full h-10 glass-input rounded-xl px-4 font-bold placeholder:text-gray-700"
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

        {/* Middle Section: Category Carousel */}
        {!showJoinInput && (
          <section className="w-full space-y-6">
            <h2 className="text-center text-xs font-black uppercase tracking-[0.4em] text-gray-500">Select Category</h2>
            <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar px-4 -mx-4">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`flex-shrink-0 w-40 h-40 glass rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                    selectedTopic === topic.id 
                      ? 'border-white bg-white/10 scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                      : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-5xl">{topic.icon}</span>
                  <span className="font-black uppercase tracking-widest text-xs text-white">{topic.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Section: Selection View (Dynamic) */}
        {!showJoinInput && selectedTopicData && (
          <section className="glass w-full max-w-2xl mx-auto p-8 sm:p-10 rounded-[2.5rem] animate-slide-up space-y-8 border-white/20">
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
