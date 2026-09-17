'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createRoom, joinRoom } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import HomeHeader from '@/components/home/HomeHeader';
import TopicGrid from '@/components/home/TopicGrid';
import TopicDetail from '@/components/home/TopicDetail';
import JoinGameForm from '@/components/home/JoinGameForm';
import { AIProvider } from '@/lib/ai';
import BackgroundToggle from '@/components/shared/BackgroundToggle';
import { Topic } from '@/lib/types/game';
import { GlassButton } from '@/components/shared/GlassButton';
import { LogIn } from 'lucide-react';

interface HomeClientProps {
  initialTopics: Topic[];
}

export default function HomeClient({ initialTopics }: HomeClientProps) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [aiProvider] = useState<AIProvider>('auto');

  useEffect(() => {
    const savedName = localStorage.getItem('player_name');
    if (savedName) {
      requestAnimationFrame(() => setNickname(savedName));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === 'j' && !selectedTopic && !showJoinInput) {
        setShowJoinInput(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTopic, showJoinInput]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateRoom = async () => {
    if (isLoading || !nickname || !selectedTopic) return;
    if (selectedTopic === 'custom' && !customTopic) return;
    
    setIsLoading(true);
    try {
      const topicToUse = selectedTopic === 'custom' ? customTopic : selectedTopic;
      const { room, player } = await createRoom(topicToUse, nickname, aiProvider, 10);
      
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
    const trimmedNick = nickname.trim();
    const cleanCode = roomCode.trim().toUpperCase();
    if (isLoading || !trimmedNick || !cleanCode) {
      showToast('Enter your name and the room code.');
      return;
    }
    
    setIsLoading(true);
    try {
      const { room, player } = await joinRoom(cleanCode, trimmedNick);
      
      localStorage.setItem('player_id', player.id);
      localStorage.setItem('player_name', trimmedNick);
      
      window.location.href = `/room/${room.code}`;
    } catch (error) {
      console.error('Error joining room:', error);
      showToast('Room not found or closed.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTopicData = initialTopics.find(t => t.id === selectedTopic);
  
  const sortedTopics = useMemo(() => {
    return [...initialTopics].sort((a, b) => {
      if (a.id === 'custom') return 1;
      if (b.id === 'custom') return -1;
      return 0; // Maintain original order for others
    });
  }, [initialTopics]);

  return (
    <main className={`min-h-screen text-foreground flex flex-col items-center p-3 sm:p-6 md:p-10 page-transition overflow-y-auto relative z-10 selection:bg-white/20 ${(showJoinInput || selectedTopic) ? 'justify-center' : ''}`}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-50">
        <BackgroundToggle />
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-50">
        <button 
          onClick={() => window.location.href = '/admin'}
          className="p-2 glass rounded-xl border-white/5 hover:border-white/20 transition-all group focus:ring-2 focus:ring-white/20 focus:outline-none"
          title="Admin Login"
          aria-label="Admin Login"
        >
          <LogIn className="w-4 h-4 text-gray-500 group-hover:text-foreground transition-colors" />
        </button>
      </div>

      <div className={`max-w-4xl w-full space-y-6 sm:space-y-10 relative z-10 py-4 sm:py-8 ${(showJoinInput || selectedTopic) ? 'flex flex-col justify-center' : ''}`}>
        {!selectedTopic && !showJoinInput && (
          <>
            <HomeHeader />
            
            <section className="w-full max-w-md mx-auto text-center">
              <GlassButton 
                onClick={() => setShowJoinInput(true)}
                className="w-full px-10 py-3 rounded-2xl font-bold text-lg"
              >
                Join a game
              </GlassButton>
            </section>

            <TopicGrid 
              topics={sortedTopics} 
              selectedTopic={selectedTopic} 
              onSelect={setSelectedTopic} 
              isLoading={false} 
            />
          </>
        )}

        {showJoinInput && (
          <div className="w-full">
            <JoinGameForm 
              nickname={nickname}
              setNickname={setNickname}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              onJoin={handleJoinRoom}
              onBack={() => setShowJoinInput(false)}
              isLoading={isLoading}
            />
          </div>
        )}

        {selectedTopic && selectedTopicData && (
          <TopicDetail 
            topicData={selectedTopicData}
            nickname={nickname}
            setNickname={setNickname}
            customTopic={customTopic}
            setCustomTopic={setCustomTopic}
            onBack={() => setSelectedTopic('')}
            onCreate={handleCreateRoom}
            isLoading={isLoading}
          />
        )}

        <footer className="text-center pt-6">
          <p className="text-gray-700 text-[10px] font-bold tracking-[1em] opacity-30 pointer-events-none">
            TriviaDuel • v4.2-GLASS
          </p>
        </footer>
      </div>
    </main>
  );
}
