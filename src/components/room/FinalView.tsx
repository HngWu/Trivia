import React, { useState, useEffect } from 'react';
import { Player, Answer, Question } from '@/lib/types/game';
import { generateLocalRoasts } from '@/lib/roasts';

interface FinalViewProps {
  sortedPlayers: Player[];
  myPlayerId: string;
  onHome: () => void;
  allAnswers: Answer[];
  questions: Question[];
}

export default function FinalView({ sortedPlayers, myPlayerId, onHome, allAnswers, questions }: FinalViewProps) {
  const [roasts, setRoasts] = useState<Record<string, string>>({});
  const [isRoasting, setIsRoasting] = useState(true);

  useEffect(() => {
    // prepare history: only include players who have at least one wrong answer
    const history = sortedPlayers.map(p => {
      const wrong = allAnswers.filter(a => a.player_id === p.id && !a.is_correct && a.submitted_answer !== "TIMEOUT_EXPIRED");
      if (wrong.length === 0) return null;
      
      return {
        name: p.name,
        wrongAnswers: wrong.map(w => {
          const q = questions.find(q => q.id === w.question_id);
          return {
            question: q?.text || "Unknown",
            answer: w.submitted_answer,
            correct: q?.correct_answer || "Unknown",
            wager: w.wager
          };
        })
      };
    }).filter(Boolean) as any[];

    if (history.length > 0) {
      const results = generateLocalRoasts(history);
      setRoasts(results);
    }
    
    setIsRoasting(false);
  }, [sortedPlayers, allAnswers, questions]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-8 space-y-12 sm:space-y-16">
      <div className="text-center space-y-3">
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Final Rankings</h2>
        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Match conclusion</p>
      </div>
      
      <div className="glass w-full max-w-2xl rounded-[2.5rem] border-white/[0.03] overflow-hidden shadow-2xl">
        {sortedPlayers.map((p, i) => {
          // Calculate rank with tie handling
          const rank = i > 0 && p.score === sortedPlayers[i - 1].score 
            ? sortedPlayers.slice(0, i).findIndex(prev => prev.score === p.score) + 1
            : i + 1;

          return (
            <div key={p.id} className={`flex items-center justify-between p-6 sm:p-10 transition-all ${i === 0 ? "bg-white/[0.05] border-b border-white/10" : "border-b border-white/[0.02] last:border-0"}`}>
               <div className="flex items-center space-x-6 sm:space-x-10">
                  <span className={`text-4xl sm:text-6xl font-bold italic tabular-nums ${i === 0 ? "text-foreground" : "text-foreground/10"}`}>
                    #{rank}
                  </span>
                  <div className="text-left">
                    <p className="text-xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">{p.name}</p>
                    <p className="text-[9px] font-bold tracking-wider text-foreground/30 uppercase">{p.id === myPlayerId ? "You" : "Player"}</p>
                  </div>
               </div>
               <span className="text-4xl sm:text-6xl font-bold tabular-nums text-foreground">{p.score}</span>
            </div>
          );
        })}
      </div>

      {/* ROAST SECTION */}
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-3">
           <div className="h-px w-12 bg-white/5" />
           <h3 className="text-[10px] font-bold text-gray-500 tracking-[0.4em] uppercase">Intelligence Report</h3>
           <div className="h-px w-12 bg-white/5" />
        </div>

        {isRoasting ? (
          <div className="text-center py-10 glass rounded-[2rem] border-white/5 animate-pulse">
            <p className="text-gray-600 font-bold text-[10px] tracking-widest uppercase italic">Synthesizing roasts...</p>
          </div>
        ) : Object.keys(roasts).length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
             {Object.entries(roasts).map(([name, roast]) => (
               <div key={name} className="glass p-6 rounded-[2rem] border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-white/20 transition-all" />
                  <div className="flex flex-col gap-2">
                     <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{name}</span>
                     <p className="text-base sm:text-lg font-semibold text-foreground italic leading-snug">
                        &quot;{roast}&quot;
                     </p>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="text-center py-10 glass rounded-[2rem] border-white/5 opacity-40">
            <p className="text-gray-700 font-bold text-[10px] tracking-widest uppercase italic">No meaningful failures detected.</p>
          </div>
        )}
      </div>
      
      <button onClick={onHome} className="mt-16 sm:mt-24 glass-button px-16 sm:px-32 py-5 rounded-2xl font-bold text-xl sm:text-2xl transition-all active:scale-95 bg-white/5 border-white/10 hover:bg-foreground hover:text-background uppercase tracking-widest">
        Leave game
      </button>
    </div>
  );
}
