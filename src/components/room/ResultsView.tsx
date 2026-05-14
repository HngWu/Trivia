import React from 'react';
import { Player, Answer } from '@/lib/types/game';
import { Button } from '@heroui/react';

interface ResultsViewProps {
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
  isLocked: boolean;
  onKick: (id: string) => void;
  onNextRound: () => void;
}

export default function ResultsView({ 
  roundData, 
  players, 
  myPlayerId, 
  isLeader,
  onNextRound
}: ResultsViewProps) {
  if (!roundData.results) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-4 sm:py-8">
      <div className="text-center space-y-8 sm:space-y-12 w-full">
        <h2 className={`text-4xl sm:text-6xl font-bold tracking-tight leading-none transition-all drop-shadow-xl ${roundData.results.correct ? "text-foreground scale-105" : "text-gray-800"}`}>
          {roundData.results.correct ? "Correct!" : "Incorrect"}
        </h2>
        
        <div className="glass p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] max-w-4xl mx-auto shadow-2xl space-y-6 sm:space-y-8 relative border-white/[0.05] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="space-y-4">
            <p className="text-gray-700 font-bold text-[10px] tracking-widest uppercase">The right answer</p>
            <p className="text-2xl sm:text-4xl font-bold text-foreground leading-tight">
              &quot;{roundData.results.answer}&quot;
            </p>
            {roundData.results.explanation && (
              <div className="mt-6 pt-6 border-t border-white/[0.02] animate-fade-in">
                <p className="text-gray-500 text-sm sm:text-base font-medium leading-relaxed max-w-2xl mx-auto italic text-gray-400">
                  {roundData.results.explanation}
                </p>
              </div>
            )}
          </div>
          
          <div className="border-t border-white/[0.02] pt-8 flex justify-between items-center px-4 sm:px-12">
            <div className="text-left space-y-1">
              <p className="text-[9px] font-bold text-gray-700 tracking-wider uppercase">Your stake</p>
              <p className="text-xl sm:text-3xl font-bold text-foreground/60 tabular-nums">{roundData.wager}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[9px] font-bold text-gray-700 tracking-wider uppercase">Points gained</p>
              <p className={`text-xl sm:text-3xl font-bold tabular-nums ${roundData.results.correct ? "text-foreground" : "text-gray-900 opacity-30"}`}>
                {roundData.results.correct ? `+${roundData.wager}` : "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto space-y-6 mt-12 sm:mt-16 animate-slide-up px-2 sm:px-0">
          <div className="flex justify-between items-center px-4">
            <p className="text-gray-700 font-bold text-[9px] tracking-widest uppercase">Round recap</p>
            <p className="text-gray-700 font-bold text-[9px] tracking-widest uppercase">{players.length} Players</p>
          </div>
          
          <div className="sm:glass sm:rounded-[2rem] sm:border-white/[0.02] sm:overflow-hidden sm:shadow-xl sm:max-h-[350px] sm:overflow-y-auto no-scrollbar">
            {/* Desktop Table View */}
            <table className="hidden sm:table w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 glass backdrop-blur-3xl border-b border-white/5">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Player</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase">Answer</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest text-center uppercase">Wager</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest text-right uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {players.map(p => {
                  const submission = roundData.competitors.find(c => c.player_id === p.id);
                  const isMe = p.id === myPlayerId;
                  
                  return (
                    <tr key={p.id} className={`transition-all duration-300 ${isMe ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
                      <td className="px-8 py-4">
                        <div className="flex flex-col">
                          <span className={`font-bold text-base ${isMe ? "text-foreground" : "text-gray-500"}`}>
                            {p.name}
                          </span>
                          {isMe && <span className="text-[8px] font-bold tracking-widest text-foreground/20 uppercase">You</span>}
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`font-semibold text-sm truncate max-w-[120px] block ${submission?.submitted_answer ? "text-gray-400" : "text-gray-800 italic"}`}>
                          {submission?.submitted_answer || "No answer"}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="font-bold text-lg text-white/50 tabular-nums">
                          {submission?.wager || "—"}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {submission ? (
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${submission.is_correct ? "bg-foreground text-background" : "text-gray-800 border border-gray-900"}`}>
                             {submission.is_correct ? "Correct" : "Wrong"}
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold uppercase opacity-20">Waiting</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card List View */}
            <div className="sm:hidden space-y-2">
              {players.map(p => {
                const submission = roundData.competitors.find(c => c.player_id === p.id);
                const isMe = p.id === myPlayerId;
                
                return (
                  <div key={p.id} className={`glass p-4 rounded-xl border-white/[0.03] flex flex-col gap-3 ${isMe ? "bg-white/[0.03] border-white/10" : ""}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-base ${isMe ? "text-foreground" : "text-gray-500"}`}>{p.name}</span>
                      {submission && (
                        <div className={`text-[9px] font-bold uppercase tracking-widest ${submission.is_correct ? "text-foreground" : "text-gray-800"}`}>
                           {submission.is_correct ? "Correct" : "Incorrect"}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.02]">
                      <div>
                         <p className="text-[8px] font-bold text-gray-700 tracking-wider uppercase">Answer</p>
                         <p className={`font-bold text-sm truncate ${submission?.submitted_answer ? "text-gray-300" : "text-gray-800 italic"}`}>
                            {submission?.submitted_answer || "None"}
                         </p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-bold text-gray-700 tracking-wider uppercase">Wager</p>
                         <p className="font-bold text-lg text-white/70 tabular-nums">{submission?.wager || "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isLeader && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-gray-700 text-[10px] font-bold tracking-widest animate-pulse">
              Next round starting soon...
            </p>
            <Button 
              size="sm"
              variant="tertiary"
              onPress={onNextRound}
              className="text-[10px] font-bold tracking-widest uppercase hover:bg-white/10 border border-white/5"
            >
              Next Round
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
