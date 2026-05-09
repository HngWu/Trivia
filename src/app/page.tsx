'use client';

import React, { useState, useEffect } from 'react';
import { createRoom, joinRoom, getTopics } from '@/lib/actions';
import Toast from '@/components/Toast';

export default function Home() {
  const [nickname, setNickname] = React.useState('');
  const [roomCode, setRoomCode] = React.useState('');
  const [selectedTopic, setSelectedTopic] = React.useState('');
  const [customTopic, setCustomTopic] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showJoinInput, setShowJoinInput] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [topics, setTopics] = React.useState<any[]>([]);
  const [isTopicsLoading, setIsTopicsLoading] = React.useState(true);

  React.useEffect(() => {
    const savedName = localStorage.getItem('player_name');
    if (savedName) {
      setNickname(savedName);
    }

    const fetchTopics = async () => {
      try {
        const data = await getTopics();
        setTopics(data || []);
      } finally {
        setIsTopicsLoading(false);
      }
    };
    fetchTopics();
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
      showToast('Enter your name and the room code.');
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
      showToast('Room not found or closed.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTopicData = topics.find(t => t.id === selectedTopic);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 md:p-12 page-transition overflow-y-auto relative selection:bg-white/20">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-50">
        <button 
          onClick={() => window.location.href = '/admin'}
          className="p-2 glass rounded-xl border-white/5 hover:border-white/20 transition-all group"
          title="Admin Settings"
        >
          <svg className="w-4 h-4 text-gray-500 group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a10.003 10.003 0 008.384-4.51l.054.09m-4.283-9.958L17.163 2m-3.733 3.103c.181.013.362.019.544.019a10.003 10.003 0 008.384-4.51c.054.09.11.178.163.266m-12.115 1.5l-1.077 1.077a2 2 0 000 2.828l1.077 1.077m2.828 0l1.077-1.077a2 2 0 000-2.828l-1.077-1.077M9 10a1 1 0 112 0 1 1 0 01-2 0zm5 2a1 1 0 112 0 1 1 0 01-2 0z" />
          </svg>
        </button>
      </div>

      <div className="max-w-4xl w-full space-y-8 sm:space-y-12 relative z-10 py-6 sm:py-10">
        <header className={`text-center space-y-3 ${selectedTopic ? 'hidden lg:block' : ''}`}>
          <h1 className="text-fluid-h1 font-bold tracking-tight text-foreground animate-fade-in">
            Trivia<span className="text-gray-500 font-normal">Duel</span>
          </h1>
          <p className="text-gray-500 font-medium tracking-widest text-[9px] sm:text-xs">
            Test your knowledge against friends
          </p>
        </header>

        <section className={`w-full max-w-md mx-auto space-y-4 text-center ${selectedTopic ? 'hidden lg:block' : ''}`}>
          {!showJoinInput ? (
            <button 
              onClick={() => setShowJoinInput(true)}
              className="glass-button w-full px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-black transition-all"
            >
              Join a Game
            </button>
          ) : (
            <div className="space-y-4 animate-fade-in glass p-6 rounded-2xl">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-base"
                />
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Room Code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="flex-1 h-11 glass-input rounded-xl px-4 font-bold tracking-widest uppercase text-base"
                  />
                  <button 
                    onClick={handleJoinRoom}
                    disabled={isLoading}
                    className="h-11 glass-button px-6 rounded-xl font-bold text-sm whitespace-nowrap bg-white/10"
                  >
                    Join
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowJoinInput(false)}
                className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground transition-colors"
              >
                Create a new game
              </button>
              </div>
              )}
              </section>

              {!showJoinInput && (
              <section className={`w-full max-w-4xl mx-auto space-y-6 ${selectedTopic ? 'hidden lg:block' : ''}`}>
              <h2 className="text-center text-[10px] font-bold tracking-[0.4em] text-gray-600">Select a topic</h2>
            {isTopicsLoading ? (
              <div className="flex justify-center py-10">
                 <div className="h-8 w-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`group relative p-5 glass rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300 border border-white/[0.02] ${
                      selectedTopic === topic.id 
                        ? 'border-white bg-white/10 scale-105 shadow-xl' 
                        : 'hover:bg-white/[0.04] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">{topic.icon}</span>
                    <span className="font-bold text-[13px] text-foreground tracking-wide">{topic.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {!showJoinInput && selectedTopicData && (
          <section className="glass w-full max-w-2xl mx-auto p-6 sm:p-10 rounded-[2.5rem] animate-slide-up space-y-6 border-white/10 shadow-xl relative overflow-hidden">
            <button 
              onClick={() => setSelectedTopic('')}
              className="lg:hidden flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground mb-2 transition-colors"
            >
              ← Back to topics
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{selectedTopicData.icon}</span>
                <h3 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">{selectedTopicData.name}</h3>
              </div>
              <p className="text-sm font-medium text-gray-400 leading-snug">
                {selectedTopicData.description}
              </p>
            </div>

            <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 space-y-2">
              <span className="text-[9px] font-bold tracking-[0.2em] text-gray-600 block">Example question</span>
              <p className="italic text-foreground font-semibold text-base sm:text-lg leading-tight">
                &quot;{selectedTopicData.example_question}&quot;
              </p>
            </div>

            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTopic === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold tracking-widest text-gray-600 ml-1">Topic name</label>
                    <input
                      type="text"
                      placeholder="e.g. 90s Music"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-base text-foreground"
                    />
                  </div>
                )}
                <div className={`space-y-2 ${selectedTopic !== 'custom' ? 'sm:col-span-2' : ''}`}>
                  <label className="text-[10px] font-bold tracking-widest text-gray-700 ml-1">Your name</label>
                  <input
                    type="text"
                    placeholder="Enter nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-base text-foreground"
                  />
                </div>
              </div>

              <button
                disabled={!nickname || (selectedTopic === 'custom' && !customTopic) || isLoading}
                onClick={handleCreateRoom}
                className="w-full glass-button py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-black transition-all bg-white/5"
              >
                {isLoading ? 'Starting game...' : 'Create room'}
              </button>
            </div>
          </section>
        )}

        <footer className="text-center pt-8">
          <p className="text-gray-700 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
            TriviaDuel • v4.1-GLASS
          </p>
        </footer>
      </div>
    </main>
  );
}
