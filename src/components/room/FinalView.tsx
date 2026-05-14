import React, { useState, useEffect } from 'react';
import { Player, Answer, Question } from '@/lib/types/game';
import { generateLocalRoasts } from '@/lib/roasts';
import { Button, Card, Separator, Spinner } from "@heroui/react";

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
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-slide-up py-8 space-y-12 sm:space-y-16">
      <div className="text-center space-y-3">
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">Final Rankings</h2>
        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Match conclusion</p>
      </div>
      
      <Card className="glass w-full max-w-2xl rounded-[2.5rem] border-white/[0.03] shadow-2xl bg-transparent overflow-hidden">
        {sortedPlayers.map((p, i) => {
          // Calculate rank with tie handling
          const rank = i > 0 && p.score === sortedPlayers[i - 1].score 
            ? sortedPlayers.slice(0, i).findIndex(prev => prev.score === p.score) + 1
            : i + 1;

          return (
            <React.Fragment key={p.id}>
              <div className={`flex items-center justify-between p-4 sm:p-6 transition-all`}>
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
              {i < sortedPlayers.length - 1 && <Separator className="bg-white/[0.02]" />}
            </React.Fragment>
          );
        })}
      </Card>

      {/* ROAST SECTION */}
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-3">
           <div className="h-px w-12 bg-white/5" />
           <h3 className="text-[10px] font-bold text-gray-500 tracking-[0.4em] uppercase">Intelligence Report</h3>
           <div className="h-px w-12 bg-white/5" />
        </div>

        {isRoasting ? (
          <Card className="text-center py-10 glass rounded-[2rem] border-white/5 bg-transparent shadow-none">
            <Spinner color="accent" size="sm" />
            <p className="text-gray-600 font-bold text-[10px] tracking-widest uppercase italic mt-4">Synthesizing roasts...</p>
          </Card>
        ) : Object.keys(roasts).length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
             {Object.entries(roasts).map(([name, roast]) => (
               <Card key={name} className="glass p-6 rounded-[2.5rem] border-white/5 relative overflow-hidden group hover:border-white/10 transition-all bg-transparent shadow-none">
                  <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-white/20 transition-all" />
                  <div className="flex flex-col gap-2">
                     <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{name}</span>
                     <p className="text-base sm:text-lg font-semibold text-foreground italic leading-snug">
                        &quot;{roast}&quot;
                     </p>
                  </div>
               </Card>
             ))}
          </div>
        ) : (
          <Card className="text-center py-10 glass rounded-[2rem] border-white/5 opacity-40 bg-transparent shadow-none">
            <p className="text-gray-700 font-bold text-[10px] tracking-widest uppercase italic">No meaningful failures detected.</p>
          </Card>
        )}
      </div>
      
      <Button 
        onPress={onHome} 
        className="mt-16 sm:mt-24 glass !border-white/10 px-16 sm:px-32 h-12 sm:h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 bg-white/5 hover:bg-foreground hover:text-background uppercase tracking-widest"
      >
        Leave game
      </Button>
    </div>
  );
}
