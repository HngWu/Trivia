'use client';

import React, { useState } from 'react';
import { createRoom, joinRoom } from '@/lib/actions';

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
      
      // 1. Generate questions via AI
      const aiResponse = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicToUse }),
      });
      
      const aiData = await aiResponse.json();
      if (!aiData.questions) throw new Error('Failed to generate questions');

      // 2. Create room and player in DB
      const { room, player } = await createRoom(topicToUse, nickname);
      
      // 3. Store in localStorage for session
      localStorage.setItem('trivia_questions', JSON.stringify(aiData.questions));
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
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-12">
        <header className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-blue-500 mb-2">TriviaDuel</h1>
          <p className="text-gray-400 text-lg">Challenge your friends in real-time trivia</p>
        </header>

        <section className="bg-gray-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-2">Your Nickname</label>
            <input
              type="text"
              id="nickname"
              placeholder="Enter nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Create a Game</h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Choose a Topic</p>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedTopic === topic.id
                          ? 'bg-blue-600 ring-2 ring-blue-400'
                          : 'bg-gray-700 hover:bg-gray-650'
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
                    className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              <button
                disabled={!nickname || !selectedTopic || isLoading}
                onClick={handleCreateRoom}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading && selectedTopic ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Join a Game</h2>
                <div>
                  <label htmlFor="roomCode" className="block text-sm text-gray-400 mb-2">Room Code</label>
                  <input
                    type="text"
                    id="roomCode"
                    placeholder="e.g. A1B2"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 uppercase"
                  />
                </div>
              </div>
              <button
                disabled={!nickname || !roomCode || isLoading}
                onClick={handleJoinRoom}
                className="w-full border-2 border-blue-600 text-blue-500 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-lg transition-all"
              >
                {isLoading && !selectedTopic ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-sm">
          Built with Next.js, Supabase, and Gemini AI
        </footer>
      </div>
    </main>
  );
}
