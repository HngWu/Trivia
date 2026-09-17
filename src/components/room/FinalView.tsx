import React, { useState, useEffect } from 'react';
import { Player, Answer, Question } from '@/lib/types/game';
import { generateLocalRoasts } from '@/lib/roasts';
import { GlassButton } from '../shared/GlassButton';

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
          const q = questions.find(question => question.id === w.question_id);
          return {
            question: q?.text || "Unknown",
            answer: w.submitted_answer,
            correct: q?.correct_answer || "Unknown",
            wager: w.wager
          };
        })
      };
    }).filter((h): h is { name: string; wrongAnswers: { question: string; answer: string; correct: string; wager: number }[] } => h !== null);

    if (history.length > 0) {
      const results = generateLocalRoasts(history);
      requestAnimationFrame(() => setRoasts(results));
    }
    
    requestAnimationFrame(() => setIsRoasting(false));
  }, [sortedPlayers, allAnswers, questions]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto animate-slide-up py-4 sm:py-6 space-y-4 sm:space-y-5 px-3 sm:px-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">Final Rankings</h2>
        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">Match conclusion</p>
      </div>
      
      <div className="glass w-full rounded-2xl sm:rounded-3xl border-white/[0.04] overflow-hidden shadow-xl">
        <div className="max-h-[200px] sm:max-h-[230px] overflow-y-auto no-scrollbar divide-y divide-white/[0.02]">
          {sortedPlayers.map((p, i) => {
            // Calculate rank with tie handling
            const rank = i > 0 && p.score === sortedPlayers[i - 1].score 
              ? sortedPlayers.slice(0, i).findIndex(prev => prev.score === p.score) + 1
              : i + 1;

            return (
              <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3 transition-all ${i === 0 ? "bg-white/[0.05]" : ""}`}>
                 <div className="flex items-center space-x-4 sm:space-x-6">
                    <span className={`text-2xl sm:text-3xl font-bold italic tabular-nums ${i === 0 ? "text-foreground" : "text-foreground/20"}`}>
                      #{rank}
                    </span>
                    <div className="text-left">
                      <p className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground">{p.name}</p>
                      <p className="text-[9px] font-bold tracking-wider text-foreground/30 uppercase">{p.id === myPlayerId ? "You" : "Player"}</p>
                    </div>
                 </div>
                 <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{p.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROAST SECTION */}
      <div className="w-full space-y-2 sm:space-y-3">
        <div className="flex items-center justify-center gap-3">
           <div className="h-px w-10 bg-white/5" />
           <h3 className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-[0.3em] uppercase">Intelligence Report</h3>
           <div className="h-px w-10 bg-white/5" />
        </div>

        {isRoasting ? (
          <div className="text-center py-4 sm:py-6 glass rounded-2xl border-white/5 animate-pulse">
            <p className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase italic">Synthesizing roasts...</p>
          </div>
        ) : Object.keys(roasts).length > 0 ? (
          <div className="max-h-[120px] sm:max-h-[140px] overflow-y-auto no-scrollbar grid grid-cols-1 gap-2 pr-0.5">
             {Object.entries(roasts).map(([name, roast]) => (
               <div key={name} className="glass p-3 sm:p-3.5 rounded-xl border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-white/20 transition-all" />
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{name}</span>
                     <p className="text-xs sm:text-sm font-semibold text-foreground italic leading-snug">
                        &quot;{roast}&quot;
                     </p>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="text-center py-4 glass rounded-2xl border-white/5 opacity-40">
            <p className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase italic">No meaningful failures detected.</p>
          </div>
        )}
      </div>
      
      <GlassButton 
        onClick={onHome} 
        className="mt-2 sm:mt-3 px-10 sm:px-14 py-3 rounded-xl font-bold text-sm sm:text-base transition-all bg-white/5 border-white/10 uppercase tracking-widest hover:bg-white/10 focus:ring-2 focus:ring-white/20 focus:outline-none"
      >
        Leave game
      </GlassButton>
    </div>
  );
}
