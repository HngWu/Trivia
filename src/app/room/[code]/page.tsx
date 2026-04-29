import React from 'react';

export default function RoomPage({ params }: { params: { code: string } }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
          <h1 className="text-3xl font-bold">Room: {params.code}</h1>
          <div className="flex items-center space-x-4">
             {/* Leaderboard Placeholder */}
             <div className="text-sm font-medium text-gray-400">Leaderboard</div>
          </div>
        </header>

        <main className="bg-gray-800 rounded-lg p-12 text-center shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Waiting for Players</h2>
          <p className="text-gray-400 mb-8">The game will start once the leader is ready.</p>
          
          <div className="flex justify-center items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </main>
      </div>
    </div>
  );
}
