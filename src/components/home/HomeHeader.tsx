import React from 'react';

export default function HomeHeader() {
  return (
    <header className="text-center space-y-3">
      <h1 className="text-fluid-h1 font-bold tracking-tight text-foreground animate-fade-in">
        Trivia<span className="text-gray-500 font-normal">Duel</span>
      </h1>
      <p className="text-gray-500 font-medium tracking-widest text-[9px] sm:text-xs">
        Test your knowledge against friends
      </p>
    </header>
  );
}
