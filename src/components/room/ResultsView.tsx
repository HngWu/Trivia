import React from 'react';
import { Player, Answer } from '@/lib/types/game';
import { Card, Table, Chip, Separator } from "@heroui/react";

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
}

export default function ResultsView({ 
  roundData, 
  players, 
  myPlayerId, 
  isLeader
}: ResultsViewProps) {
  if (!roundData.results) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full animate-fade-in py-4 sm:py-8">
      <div className="text-center space-y-8 sm:space-y-12 w-full">
        <h2 className={`text-4xl sm:text-6xl font-bold tracking-tight leading-none transition-all drop-shadow-xl ${roundData.results.correct ? "text-foreground scale-105" : "text-gray-800"}`}>
          {roundData.results.correct ? "Correct!" : "Incorrect"}
        </h2>
        
        <Card className="glass p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] max-w-4xl mx-auto shadow-2xl space-y-6 sm:space-y-8 relative border-white/[0.05] overflow-hidden bg-transparent">
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
          
          <Separator className="bg-white/[0.02]" />
          
          <div className="pt-2 flex justify-between items-center px-4 sm:px-12">
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
        </Card>

        <div className="w-full max-w-4xl mx-auto space-y-6 mt-12 sm:mt-16 animate-slide-up px-2 sm:px-0">
          <div className="flex justify-between items-center px-4">
            <p className="text-gray-700 font-bold text-[9px] tracking-widest uppercase">Round recap</p>
            <p className="text-gray-700 font-bold text-[9px] tracking-widest uppercase">{players.length} Players</p>
          </div>
          
          <div className="hidden sm:block overflow-hidden">
            <Table className="bg-transparent">
              <Table.ScrollContainer className="max-h-[400px] overflow-y-auto no-scrollbar">
                <Table.Content aria-label="Round recap" className="min-w-full">
                  <Table.Header>
                    <Table.Column isRowHeader className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-transparent border-none">Player</Table.Column>
                    <Table.Column className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-transparent border-none">Answer</Table.Column>
                    <Table.Column className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-transparent border-none text-center">Wager</Table.Column>
                    <Table.Column className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-transparent border-none text-right">Result</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {players.map(p => {
                      const submission = roundData.competitors.find(c => c.player_id === p.id);
                      const isMe = p.id === myPlayerId;
                      
                      return (
                        <Table.Row key={p.id} className={`transition-all duration-300 border-b border-white/[0.02] last:border-none ${isMe ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"}`}>
                          <Table.Cell className="px-8 py-4 bg-transparent border-none">
                            <div className="flex flex-col text-left">
                              <span className={`font-bold text-base ${isMe ? "text-foreground" : "text-gray-500"}`}>
                                {p.name}
                              </span>
                              {isMe && <span className="text-[8px] font-bold tracking-widest text-foreground/20 uppercase">You</span>}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="px-8 py-4 bg-transparent border-none">
                            <span className={`font-semibold text-sm truncate max-w-[120px] block ${submission?.submitted_answer ? "text-gray-400" : "text-gray-800 italic"}`}>
                              {submission?.submitted_answer || "No answer"}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="px-8 py-4 bg-transparent border-none text-center">
                            <span className="font-bold text-lg text-white/50 tabular-nums">
                              {submission?.wager || "—"}
                            </span>
                          </Table.Cell>
                          <Table.Cell className="px-8 py-4 bg-transparent border-none text-right">
                            {submission ? (
                              <Chip 
                                size="sm"
                                className={submission.is_correct ? "bg-foreground text-background" : "bg-transparent text-gray-800 border-gray-900"}
                                variant={submission.is_correct ? "primary" : "soft"}
                              >
                                 {submission.is_correct ? "Correct" : "Wrong"}
                              </Chip>
                            ) : (
                              <span className="text-[9px] font-bold uppercase opacity-20">Waiting</span>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden space-y-2">
            {players.map(p => {
              const submission = roundData.competitors.find(c => c.player_id === p.id);
              const isMe = p.id === myPlayerId;
              
              return (
                <Card key={p.id} className={`glass p-4 rounded-xl border-white/[0.03] flex flex-col gap-3 bg-transparent shadow-none ${isMe ? "bg-white/[0.03] border-white/10" : ""}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-base ${isMe ? "text-foreground" : "text-gray-500"}`}>{p.name}</span>
                    {submission && (
                      <Chip 
                        size="sm"
                        className={submission.is_correct ? "text-foreground bg-white/5" : "text-gray-800 bg-transparent"}
                        variant="soft"
                      >
                         {submission.is_correct ? "Correct" : "Incorrect"}
                      </Chip>
                    )}
                  </div>
                  <Separator className="bg-white/[0.02]" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
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
                </Card>
              );
            })}
          </div>
        </div>

        {isLeader && (
          <p className="text-gray-700 text-[10px] font-bold tracking-widest animate-pulse mt-8">
            Next round starting soon...
          </p>
        )}
      </div>
    </div>
  );
}
