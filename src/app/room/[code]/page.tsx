'use client';

import React, { useState, useEffect } from 'react';

type Question = {
  summary: string;
  text: string;
  type: 'multiple_choice' | 'boolean' | 'text';
  options: string[] | null;
  correct_answer: string;
};

type GameState = 'lobby' | 'wager' | 'question' | 'results' | 'final';

export default function RoomPage({ params }: { params: { code: string } }) {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState(0);
  const [availableWeights, setAvailableWeights] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [currentWager, setCurrentWager] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [lastResult, setLastResult] = useState<{ correct: boolean; answer: string } | null>(null);

  useEffect(() => {
    const savedQuestions = localStorage.getItem('trivia_questions');
    const savedName = localStorage.getItem('player_name');
    if (savedQuestions) setQuestions(JSON.parse(savedQuestions));
    if (savedName) setPlayerName(savedName);
  }, []);

  const handleStartGame = () => setGameState('wager');

  const handleSelectWager = (weight: number) => {
    setCurrentWager(weight);
    setAvailableWeights(prev => prev.filter(w => w !== weight));
    setGameState('question');
  };

  const handleSubmitAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correct_answer.toLowerCase();
    
    if (isCorrect && currentWager) {
      setScore(prev => prev + currentWager);
    }
    
    setLastResult({ correct: isCorrect, answer: currentQuestion.correct_answer });
    setGameState('results');
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setCurrentWager(null);
      setGameState('wager');
    } else {
      setGameState('final');
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Nav Leaderboard */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => window.location.href = '/'} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="font-bold text-xl text-blue-500">TriviaDuel</span>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Room Code</p>
            <p className="font-mono font-bold">{params.code}</p>
          </div>
          <div className="bg-gray-700 px-4 py-2 rounded-lg border border-gray-600">
            <p className="text-xs text-gray-400 uppercase">Your Score</p>
            <p className="text-xl font-black text-yellow-400">{score}</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        {gameState === 'lobby' && (
          <div className="text-center space-y-8 animate-fade-in">
            <h2 className="text-4xl font-bold">Welcome, {playerName}!</h2>
            <p className="text-gray-400">Waiting for other players to join... (Solo Mode Active)</p>
            <button
              onClick={handleStartGame}
              className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'wager' && currentQuestion && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center space-y-4">
              <p className="text-blue-500 font-bold uppercase tracking-widest">Question {currentIndex + 1} of 10</p>
              <h2 className="text-3xl font-bold">Topic: {currentQuestion.summary}</h2>
              <p className="text-gray-400">How much do you want to wager on this question?</p>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(weight => {
                const isAvailable = availableWeights.includes(weight);
                return (
                  <button
                    key={weight}
                    disabled={!isAvailable}
                    onClick={() => handleSelectWager(weight)}
                    className={`h-20 rounded-xl font-black text-2xl transition-all ${
                      isAvailable 
                        ? 'bg-gray-800 border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-750 text-white' 
                        : 'bg-gray-900 border-2 border-gray-800 text-gray-700 cursor-not-allowed opacity-30'
                    }`}
                  >
                    {weight}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-sm text-gray-500 italic">Each point weight can only be used once per game.</p>
          </div>
        )}

        {gameState === 'question' && currentQuestion && (
          <div className="w-full space-y-8 animate-fade-in">
             <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                   <span className="text-blue-400 font-bold">{currentQuestion.summary}</span>
                   <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm font-bold">Wager: {currentWager}</span>
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
                            userAnswer === option ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-500'
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
                            userAnswer === val ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 hover:border-gray-500'
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
                      className="w-full bg-gray-900 border-2 border-gray-700 rounded-xl px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="text-center space-y-8 animate-fade-in">
            <div className={`text-7xl mb-4 ${lastResult.correct ? 'text-green-500' : 'text-red-500'}`}>
              {lastResult.correct ? '✓ Correct!' : '✗ Wrong!'}
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-lg">The correct answer was:</p>
              <p className="text-3xl font-bold text-blue-400">{lastResult.answer}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
               <p className="text-gray-400">Points Gained</p>
               <p className="text-4xl font-black text-yellow-400">{lastResult.correct ? `+${currentWager}` : '0'}</p>
            </div>
            <button
              onClick={handleNextQuestion}
              className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
            </button>
          </div>
        )}

        {gameState === 'final' && (
          <div className="text-center space-y-12 animate-slide-up">
            <header className="space-y-4">
              <h2 className="text-5xl font-black text-yellow-400">Game Over!</h2>
              <p className="text-2xl text-gray-400">Well played, {playerName}!</p>
            </header>
            
            <div className="bg-gray-800 p-12 rounded-3xl border-4 border-yellow-500 shadow-2xl space-y-6">
              <p className="text-2xl font-bold text-gray-300 uppercase tracking-widest">Final Score</p>
              <p className="text-9xl font-black text-white">{score}</p>
              <div className="pt-6 border-t border-gray-700">
                 <p className="text-gray-500">Rank: #1 (Local Leaderboard)</p>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </main>

      <footer className="p-6 text-center text-gray-600 text-sm">
        TriviaDuel v1.0 • Solo Experience
      </footer>
    </div>
  );
}
