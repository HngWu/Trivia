'use client';

import React, { useState, useEffect } from 'react';
import { createRoom, joinRoom, getTopics } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import HomeHeader from '@/components/home/HomeHeader';
import TopicGrid from '@/components/home/TopicGrid';
import TopicDetail from '@/components/home/TopicDetail';
import JoinGameForm from '@/components/home/JoinGameForm';
import { AIProvider } from '@/lib/ai';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [isTopicsLoading, setIsTopicsLoading] = useState(true);
  const [aiProvider, setAIProvider] = useState<AIProvider>('auto');

  useEffect(() => {
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
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateRoom = async () => {
    if (isLoading || !nickname || !selectedTopic) return;
    if (selectedTopic === 'custom' && !customTopic) return;
    
    setIsLoading(true);
    try {
      const topicToUse = selectedTopic === 'custom' ? customTopic : selectedTopic;
      const { room, player } = await createRoom(topicToUse, nickname, aiProvider);
      
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
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-3 sm:p-6 md:p-10 page-transition overflow-y-auto relative selection:bg-white/20">
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

      <div className="max-w-4xl w-full space-y-6 sm:space-y-10 relative z-10 py-4 sm:py-8">
        {!selectedTopic && !showJoinInput && (
          <>
            <HomeHeader />
            
            <section className="w-full max-w-md mx-auto text-center">
              <button 
                onClick={() => setShowJoinInput(true)}
                className="glass-button w-full px-10 py-3 rounded-2xl font-bold text-lg hover:bg-foreground hover:text-background transition-all"
              >
                Join a game
              </button>
            </section>

            <TopicGrid 
              topics={topics} 
              selectedTopic={selectedTopic} 
              onSelect={setSelectedTopic} 
              isLoading={isTopicsLoading} 
            />
          </>
        )}

        {showJoinInput && (
          <JoinGameForm 
            nickname={nickname}
            setNickname={setNickname}
            roomCode={roomCode}
            setRoomCode={setRoomCode}
            onJoin={handleJoinRoom}
            onBack={() => setShowJoinInput(false)}
            isLoading={isLoading}
          />
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
            aiProvider={aiProvider}
            setAIProvider={setAIProvider}
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
