import React from 'react';
import { Player, Answer, Question } from '@/lib/types/game';
import { GlassButton } from '../shared/GlassButton';
import { Card, CardContent } from '@/components/ui/card';

interface ResultsViewProps {
  currentQuestion?: Question;
  roundData: {
    results: {
      correct: boolean;
      answer: string;
      explanation?: string;
    } | null;
    wager: number | null;
    competitors: Answer[];
  };
  players: Player[];
  myPlayerId: string;
  isLeader: boolean;
  isLocked?: boolean;
  isLastRound?: boolean;
  onNextRound: () => void;
}

export default function ResultsView({ 
  currentQuestion,
  roundData, 
  players, 
  myPlayerId, 
  isLeader,
  isLocked = false,
  isLastRound = false,
  onNextRound
}: ResultsViewProps) {
  if (!roundData.results) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full animate-fade-in pt-16 sm:pt-18 md:pt-20 pb-3 md:pb-4 space-y-3 sm:space-y-3.5 px-3 sm:px-6">
      
      {/* Question Details Recap */}
      {currentQuestion && (
        <div className="text-center w-full max-w-3xl space-y-1 px-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.04] border border-white/[0.08]">
            Question Recap
          </span>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground/90 leading-snug break-words">
            &quot;{currentQuestion.text}&quot;
          </p>
        </div>
      )}

      {/* Players Results List */}
      <div className="w-full max-w-4xl">
        <div className="flex flex-col gap-1.5 max-h-[160px] sm:max-h-[190px] overflow-y-auto no-scrollbar pr-0.5">
          {players.map(p => {
            const submission = roundData.competitors.find(c => c.player_id === p.id);
            const isMe = p.id === myPlayerId;
            const isCorrect = submission?.is_correct;
            const hasAnswered = !!submission;

            const highlightClass = isMe ? 'bg-white/10 border-white/20 shadow-md' : 'bg-white/5 border-white/10 text-foreground';
            const textHighlight = hasAnswered 
              ? (isCorrect ? 'text-success' : 'text-destructive')
              : 'text-muted-foreground';

            const wagerHighlight = hasAnswered 
              ? (isCorrect ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30')
              : 'bg-white/5 text-muted-foreground border-white/10';

            return (
              <div 
                key={p.id} 
                className={`flex flex-wrap sm:flex-nowrap justify-between items-center px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border ${highlightClass} transition-all gap-2`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className={`font-bold text-sm sm:text-base truncate ${isMe ? 'underline underline-offset-4' : ''}`}>
                    {p.name}
                  </span>
                  {isMe && <span className="text-[10px] uppercase font-bold opacity-60 shrink-0">(You)</span>}
                </div>
                <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-auto">
                  <span className={`font-semibold text-xs sm:text-sm max-w-[140px] sm:max-w-[280px] truncate ${textHighlight}`}>
                    {submission?.submitted_answer || "No answer"}
                  </span>
                  <span className={`font-bold text-xs sm:text-sm min-w-[48px] sm:min-w-[56px] px-2 sm:px-2.5 py-0.5 rounded-lg border text-center ${wagerHighlight}`}>
                    {submission?.wager ? `${submission.wager} pts` : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Correct Answer Card */}
      <div className="w-full flex justify-center mt-1 sm:mt-2">
        <Card className="w-full max-w-4xl border-white/10 bg-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <CardContent className="p-3.5 sm:p-5 md:p-6 text-left space-y-2 sm:space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-success/80 font-bold text-[9px] sm:text-[10px] tracking-[0.25em] uppercase">The Correct Answer</h3>
              <p className="text-base sm:text-xl md:text-2xl font-black text-foreground leading-tight tracking-tight break-words">
                {roundData.results.answer}
              </p>
            </div>
            {roundData.results.explanation && (
              <div className="pt-2 sm:pt-2.5 border-t border-white/5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Explanation</p>
                <p className="text-muted-foreground text-xs sm:text-sm font-medium leading-relaxed max-w-3xl italic break-words">
                  &quot;{roundData.results.explanation}&quot;
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Round / Leaderboard Button for Leader */}
      {isLeader && (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 pt-0.5">
          <p className="text-muted-foreground text-[10px] sm:text-[11px] font-bold tracking-widest animate-pulse uppercase">
            {isLastRound ? "Final standings incoming..." : "Next round starting soon..."}
          </p>
          <GlassButton 
            onClick={onNextRound}
            disabled={isLocked}
            className="min-w-[190px] py-2.5 sm:py-3 px-8 rounded-xl font-bold tracking-widest uppercase text-xs sm:text-sm focus:ring-2 focus:ring-white/20 focus:outline-none"
          >
            {isLocked ? "Starting..." : (isLastRound ? "Show Leaderboard" : "Next Round")}
          </GlassButton>
        </div>
      )}
    </div>
  );
}
