'use client';

import React, { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

type Question = {
  summary: string;
  text: string;
  type: 'multiple_choice' | 'boolean' | 'text';
  options: string[] | null;
  correct_answer: string;
};

type Player = {
  id: string;
  name: string;
  score: number;
  is_leader: boolean;
};

type GameState = 'lobby' | 'wager' | 'question' | 'results' | 'final';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const unwrappedParams = use(params);
  const roomCode = unwrappedParams.code;
  
  const supabase = createClient();
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [availableWeights, setAvailableWeights] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [currentWager, setCurrentWager] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [lastResult, setLastResult] = useState<{ correct: boolean; answer: string } | null>(null);

  const myPlayer = players.find(p => p.id === myPlayerId);

  useEffect(() => {
    const savedId = localStorage.getItem('player_id');
    if (savedId) setMyPlayerId(savedId);

    const fetchRoomData = async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status, current_question_index')
        .eq('code', roomCode)
        .single();

      if (roomData) {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomData.id);
          
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .eq('room_id', roomData.id)
          .order('id');
        
        if (playerData) setPlayers(playerData);
        if (questionData) setQuestions(questionData);
        if (roomData.status) setGameState(roomData.status as GameState);
        setCurrentIndex(roomData.current_question_index);
      }
    };

    fetchRoomData();

    const channel = supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [...prev, payload.new as Player]);
        } else if (payload.eventType === 'UPDATE') {
          setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new as Player : p));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        setGameState(payload.new.status as GameState);
        setCurrentIndex(payload.new.current_question_index);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, supabase]);

  const handleStartGame = async () => {
    await supabase
      .from('rooms')
      .update({ status: 'wager' })
      .eq('code', roomCode);
  };

  const handleSelectWager = (weight: number) => {
    setCurrentWager(weight);
    setAvailableWeights(prev => prev.filter(w => w !== weight));
    setGameState('question');
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correct_answer.toLowerCase();
    
    if (isCorrect && currentWager && myPlayer) {
      const newScore = myPlayer.score + currentWager;
      await supabase
        .from('players')
        .update({ score: newScore })
        .eq('id', myPlayerId);
    }
    
    setLastResult({ correct: isCorrect, answer: currentQuestion.correct_answer });
    setGameState('results');
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      if (myPlayer?.is_leader) {
        await supabase
          .from('rooms')
          .update({ 
            current_question_index: currentIndex + 1,
            status: 'wager'
          })
          .eq('code', roomCode);
      }
      setUserAnswer('');
      setCurrentWager(null);
    } else {
      if (myPlayer?.is_leader) {
        await supabase
          .from('rooms')
          .update({ status: 'final' })
          .eq('code', roomCode);
      }
    }
  };

  const currentQuestion = questions[currentIndex];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2 flex justify-between items-center sticky top-0 z-10 overflow-x-auto shadow-sm">
        <div className="flex items-center space-x-4 shrink-0">
          <button onClick={() => window.location.href = '/'} className="text-gray-500 dark:text-gray-400 hover:text-blue-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="font-bold text-lg text-blue-600 dark:text-blue-500 hidden md:inline">TriviaDuel</span>
        </div>
        
        <div className="flex items-center space-x-4 px-4 overflow-x-auto no-scrollbar">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className={`flex items-center space-x-2 px-3 py-1 rounded-full shrink-0 ${p.id === myPlayerId ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{i + 1}</span>
              <span className="text-sm font-medium truncate max-w-[80px]">{p.name}</span>
              <span className="text-sm font-black text-blue-600 dark:text-yellow-400">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-4 shrink-0 ml-4">
           <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Room</p>
              <p className="font-mono font-bold text-sm">{roomCode}</p>
           </div>
           <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        {gameState === 'lobby' && (
          <div className="text-center space-y-8 w-full animate-fade-in">
            <h2 className="text-4xl font-bold">Lobby</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-auto space-y-4 shadow-lg">
               <p className="text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-widest">Players ({players.length}/10)</p>
               <div className="space-y-2">
                 {players.map(p => (
                   <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="font-bold">{p.name} {p.is_leader && '👑'}</span>
                      <span className="text-xs text-gray-400">{p.id === myPlayerId ? '(You)' : 'Ready'}</span>
                   </div>
                 ))}
               </div>
            </div>
            {myPlayer?.is_leader ? (
              <button
                onClick={handleStartGame}
                className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
              >
                Start Game
              </button>
            ) : (
              <p className="text-blue-500 animate-pulse">Waiting for leader to start...</p>
            )}
          </div>
        )}

        {gameState === 'wager' && currentQuestion && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center space-y-4">
              <p className="text-blue-600 dark:text-blue-500 font-bold uppercase tracking-widest">Question {currentIndex + 1} of 10</p>
              <h2 className="text-3xl font-bold">Topic: {currentQuestion.summary}</h2>
              <p className="text-gray-500 dark:text-gray-400">How much do you want to wager on this question?</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isAvailable = availableWeights.includes(weight);
                return (
                  <button
                    key={weight}
                    disabled={!isAvailable}
                    onClick={() => handleSelectWager(weight)}
                    className={`h-20 rounded-xl font-black text-2xl transition-all ${
                      isAvailable 
                        ? 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 text-gray-900 dark:text-white shadow-sm' 
                        : 'bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {weight}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'question' && currentQuestion && (
          <div className="w-full space-y-8 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                   <span className="text-blue-600 dark:text-blue-400 font-bold">{currentQuestion.summary}</span>
                   <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-bold">Wager: {currentWager}</span>
                </div>
                <h2 className="text-2xl font-bold leading-relaxed">{currentQuestion.text}</h2>

                <div className="space-y-4">
                  {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQuestion.options.map((option, i) => (
                        <button
                          key={i}
                          onClick={() => setUserAnswer(option)}
                          className={`p-4 rounded-xl text-left border-2 transition-all ${
                            userAnswer === option ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'boolean' && (
                    <div className="flex space-x-4">
                      {['True', 'False'].map(val => (
                        <button
                          key={val}
                          onClick={() => setUserAnswer(val)}
                          className={`flex-1 p-6 rounded-xl font-bold text-xl border-2 transition-all ${
                            userAnswer === val ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-gray-500'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'text' && (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type your answer here..."
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
             </div>

             <button
                disabled={!userAnswer}
                onClick={handleSubmitAnswer}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-xl shadow-lg transition-all"
              >
                Submit Answer
              </button>
          </div>
        )}

        {gameState === 'results' && lastResult && (
          <div className="text-center space-y-8 animate-fade-in w-full">
            <div className={`text-6xl font-black ${lastResult.correct ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {lastResult.correct ? 'CORRECT!' : 'WRONG!'}
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-md mx-auto shadow-lg">
               <p className="text-gray-500 dark:text-gray-400 mb-2">The answer was:</p>
               <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-6">{lastResult.answer}</p>
               <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                 <p className="text-sm text-gray-400 uppercase">Points Gained</p>
                 <p className="text-4xl font-black text-yellow-500 dark:text-yellow-400">{lastResult.correct ? `+${currentWager}` : '0'}</p>
               </div>
            </div>
            {myPlayer?.is_leader ? (
              <button
                onClick={handleNextQuestion}
                className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'View Final Results'}
              </button>
            ) : (
              <p className="text-blue-500 animate-pulse">Waiting for leader to continue...</p>
            )}
          </div>
        )}

        {gameState === 'final' && (
          <div className="text-center space-y-8 w-full max-w-lg mx-auto animate-slide-up">
            <h2 className="text-4xl font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-tighter">Final Standings</h2>
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xl">
              {sortedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-6 ${i === 0 ? 'bg-yellow-50 dark:bg-yellow-500/10' : ''} ${i < sortedPlayers.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                   <div className="flex items-center space-x-4">
                      <span className={`text-2xl font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <span className="text-xl font-bold">{p.name} {p.id === myPlayerId && '(You)'}</span>
                   </div>
                   <span className="text-3xl font-black text-gray-900 dark:text-white">{p.score}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold shadow-md"
            >
              Back to Menu
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
