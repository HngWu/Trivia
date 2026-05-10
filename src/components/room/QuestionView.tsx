import React from 'react';
import { Question, Player } from '@/lib/types/game';

interface QuestionViewProps {
  currentQuestion: Question | undefined;
  roundData: {
    answer: string;
    answerCount: number;
    wager: number | null;
  };
  players: Player[];
  isLocked: boolean;
  textAnswer: string;
  setTextAnswer: (val: string) => void;
  onSubmitAnswer: (val: string) => void;
}

export default function QuestionView({ 
  currentQuestion, 
  roundData, 
  players, 
  isLocked, 
  textAnswer, 
  setTextAnswer, 
  onSubmitAnswer 
}: QuestionViewProps) {
  // Add keyboard shortcuts for answering
  React.useEffect(() => {
    if (isLocked || roundData.answer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentQuestion?.type === "multiple_choice") {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (currentQuestion.options && currentQuestion.options[idx]) {
            onSubmitAnswer(currentQuestion.options[idx]);
          }
        }
      } else if (currentQuestion?.type === "boolean") {
        if (e.key.toLowerCase() === "t") onSubmitAnswer("True");
        if (e.key.toLowerCase() === "f") onSubmitAnswer("False");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, isLocked, roundData.answer, onSubmitAnswer]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-center py-4">
       <div className="glass p-6 sm:p-12 rounded-[2rem] shadow-2xl space-y-8 relative overflow-hidden border-white/[0.05]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight text-foreground">
             &quot;{currentQuestion?.text}&quot;
          </h2>

          {!roundData.answer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                <button 
                  key={i} 
                  disabled={isLocked}
                  onClick={() => onSubmitAnswer(option)} 
                  className="p-4 sm:p-6 rounded-xl text-left border border-white/10 bg-white/[0.02] transition-all font-bold text-base sm:text-lg hover:bg-white hover:text-black hover:border-white active:scale-95 group disabled:opacity-50 focus:ring-2 focus:ring-white/20 focus:outline-none"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <span className="mr-3 opacity-20 font-bold group-hover:opacity-100 transition-all">{String.fromCharCode(65 + i)}</span> 
                      {option}
                    </div>
                    <span className="text-[10px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{i + 1}]</span>
                  </div>
                </button>
              ))}
              {currentQuestion?.type === "boolean" && ["True", "False"].map(val => (
                <button 
                  key={val} 
                  disabled={isLocked}
                  onClick={() => onSubmitAnswer(val)} 
                  className="p-8 rounded-2xl font-bold text-2xl border border-white/10 bg-white/[0.02] transition-all hover:bg-white hover:text-black hover:border-white active:scale-95 disabled:opacity-50 focus:ring-2 focus:ring-white/20 focus:outline-none group relative"
                >
                  {val}
                  <span className="absolute bottom-2 right-4 text-[10px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{val[0]}]</span>
                </button>
              ))}
              {currentQuestion?.type === "text" && (
                <form 
                  onSubmit={(e) => { e.preventDefault(); onSubmitAnswer(textAnswer); }}
                  className="col-span-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
                >
                  <input 
                    type="text" 
                    autoFocus 
                    disabled={isLocked}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your answer..." 
                    className="flex-1 w-full py-3 glass-input rounded-xl px-4 font-semibold text-base text-foreground focus:ring-2 focus:ring-white/10" 
                  />
                  <button 
                    type="submit"
                    disabled={isLocked || !textAnswer.trim()}
                    className="w-full sm:w-auto py-3 px-8 bg-foreground text-background rounded-xl font-bold text-base hover:bg-white transition-all active:scale-95"
                  >
                    Submit
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-8">
              <p className="text-foreground text-2xl sm:text-4xl font-bold tracking-tight animate-pulse italic">Answer submitted</p>
              <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">Waiting for everyone ({roundData.answerCount}/{players.length})</p>
            </div>
          )}
       </div>
       <div className="pt-4">
          <span className="glass px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500 border-white/[0.03]">
            Your wager: <span className="text-foreground">{roundData.wager} Points</span>
          </span>
       </div>
    </div>
  );
}
