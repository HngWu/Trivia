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
  { id: 'custom', name: 'Custom Topic', icon: '✨' },
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-2xl w-full space-y-12">
        <header className="text-center">
          <h1 className="text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-500 mb-2 italic">TriviaDuel</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Challenge your friends in real-time trivia</p>
        </header>

        <section className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl space-y-8 border border-gray-100 dark:border-gray-700">
          <div>
            <label htmlFor="nickname" className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Your Nickname</label>
            <input
              type="text"
              id="nickname"
              placeholder="Enter nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Create a Game</h2>
              <div className="space-y-3">
                <p className="text-sm text-gray-400 font-bold uppercase">Topic</p>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-3 rounded-xl text-left transition-all font-medium ${
                        selectedTopic === topic.id
                          ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650'
                      }`}
                    >
                      <span className="mr-2">{topic.icon}</span>
                      {topic.name}
                    </button>
                  ))}
                </div>
                {selectedTopic === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom topic..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full mt-2 bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                )}
              </div>
              <button
                disabled={!nickname || !selectedTopic || isLoading}
                onClick={handleCreateRoom}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest"
              >
                {isLoading && selectedTopic ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tight">Join a Game</h2>
                <div>
                  <label htmlFor="roomCode" className="block text-sm text-gray-400 font-bold uppercase mb-3">Room Code</label>
                  <input
                    type="text"
                    id="roomCode"
                    placeholder="e.g. A1B2"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 uppercase font-black tracking-widest text-center text-xl"
                  />
                </div>
              </div>
              <button
                disabled={!nickname || !roomCode || isLoading}
                onClick={handleJoinRoom}
                className="w-full border-4 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white disabled:opacity-50 font-black py-4 rounded-xl transition-all uppercase tracking-widest"
              >
                {isLoading && !selectedTopic ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
          Built with Next.js • Supabase • Gemini AI
        </footer>
      </div>
    </main>
  );
}
