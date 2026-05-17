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
  onNextRound: () => void;
}

export default function ResultsView({ 
  currentQuestion,
  roundData, 
  players, 
  myPlayerId, 
  isLeader,
  onNextRound
}: ResultsViewProps) {
  if (!roundData.results) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full animate-fade-in py-4 sm:py-8 space-y-6">
      
      {currentQuestion && (
        <div className="text-center w-full max-w-4xl space-y-2 mb-4">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground drop-shadow-sm">
            {currentQuestion.text}
          </h2>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-4">
        <div className="flex flex-col gap-2">
          {players.map(p => {
            const submission = roundData.competitors.find(c => c.player_id === p.id);
            const isMe = p.id === myPlayerId;
            const isCorrect = submission?.is_correct;
            const hasAnswered = !!submission;

            const highlightClass = isMe ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 text-foreground';
            const textHighlight = hasAnswered 
              ? (isCorrect ? 'text-success' : 'text-destructive')
              : 'text-muted-foreground';

            const wagerHighlight = hasAnswered 
              ? (isCorrect ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30')
              : 'bg-white/5 text-muted-foreground border-white/10';

            return (
              <div 
                key={p.id} 
                className={`flex justify-between items-center p-4 rounded-xl border ${highlightClass} transition-all`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${isMe ? 'underline underline-offset-4' : ''}`}>
                    {p.name}
                  </span>
                  {isMe && <span className="text-[10px] uppercase font-bold opacity-60">(You)</span>}
                </div>
                <div className={`text-right flex items-center gap-6`}>
                  <span className={`font-semibold text-lg max-w-[150px] sm:max-w-[300px] truncate ${textHighlight}`}>
                    {submission?.submitted_answer || "No answer"}
                  </span>
                  <span className={`font-bold text-lg min-w-[50px] px-3 py-1 rounded-lg border text-center ${wagerHighlight}`}>
                    {submission?.wager || "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full flex justify-center mt-8">
        <Card className="w-full max-w-4xl border-white/10 bg-white/5 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1" />
          <CardContent className="p-6 sm:p-12 text-left space-y-6">
            <div className="space-y-1">
              <p className="text-success/60 font-bold text-xs tracking-[0.3em] uppercase">The Correct Answer</p>
              <p className="text-2xl sm:text-4xl font-black text-foreground leading-none tracking-tighter">
                {roundData.results.answer}
              </p>
            </div>
            {roundData.results.explanation && (
              <div className="pt-6 border-t border-white/5">
                <p className="text-muted-foreground text-lg sm:text-xl font-medium leading-relaxed max-w-3xl italic">
                  &quot;{roundData.results.explanation}&quot;
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLeader && (
        <div className="flex flex-col items-center gap-4 mt-8 pt-4">
          <p className="text-muted-foreground text-[12px] font-bold tracking-widest animate-pulse uppercase">
            Next round starting soon...
          </p>
          <GlassButton 
            onClick={onNextRound}
            className="min-w-[200px] py-4 rounded-xl font-bold tracking-widest uppercase"
          >
            Next Round
          </GlassButton>
        </div>
      )}
    </div>
  );
}
