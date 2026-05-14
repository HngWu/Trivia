import React from 'react';
import { Question, Player } from '@/lib/types/game';
import { Button, Input, Card, Chip, TextField, Label } from "@heroui/react";

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
      } else if (currentQuestion?.type === "boolean" || currentQuestion?.type === "boolean_yes_no") {
        const key = e.key.toLowerCase();
        if (currentQuestion.type === "boolean") {
          if (key === "t") onSubmitAnswer("True");
          if (key === "f") onSubmitAnswer("False");
        } else {
          if (key === "y") onSubmitAnswer("Yes");
          if (key === "n") onSubmitAnswer("No");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, isLocked, roundData.answer, onSubmitAnswer]);

  const booleanOptions = currentQuestion?.type === "boolean_yes_no" ? ["Yes", "No"] : ["True", "False"];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-center py-4">
       <Card className="glass p-6 sm:p-12 rounded-[2rem] shadow-2xl space-y-8 relative overflow-hidden border-white/[0.05] bg-transparent">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight text-foreground">
             &quot;{currentQuestion?.text}&quot;
          </h2>

          {!roundData.answer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.type === "multiple_choice" && currentQuestion.options?.map((option, i) => (
                <Button 
                  key={i} 
                  isDisabled={isLocked}
                  onPress={() => onSubmitAnswer(option)} 
                  className="h-14 sm:h-16 px-6 sm:px-8 rounded-xl text-left transition-all font-bold text-base sm:text-lg glass-button hover:!border-white/30 active:scale-95 group relative min-w-0 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <span className="mr-3 opacity-20 font-bold group-hover:opacity-100 transition-all">{String.fromCharCode(65 + i)}</span> 
                    {option}
                  </div>
                  <span className="text-[10px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{i + 1}]</span>
                </Button>
              ))}
              {(currentQuestion?.type === "boolean" || currentQuestion?.type === "boolean_yes_no") && booleanOptions.map(val => (
                <Button 
                  key={val} 
                  isDisabled={isLocked}
                  onPress={() => onSubmitAnswer(val)} 
                  className="h-16 sm:h-24 rounded-2xl font-bold text-2xl transition-all glass-button hover:!border-white/30 active:scale-95 group relative min-w-0"
                >
                  {val}
                  <span className="absolute bottom-2 right-4 text-[10px] opacity-0 group-hover:opacity-30 transition-opacity font-mono">[{val[0]}]</span>
                </Button>
              ))}
              {currentQuestion?.type === "text" && (
                <form 
                  onSubmit={(e) => { e.preventDefault(); onSubmitAnswer(textAnswer); }}
                  className="col-span-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
                >
                  <TextField name="textAnswer" value={textAnswer} onChange={setTextAnswer} isDisabled={isLocked} className="flex-1 text-left">
                    <Label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 ml-1">Answer</Label>
                    <Input 
                      autoFocus 
                      placeholder="Type your answer..." 
                      className="glass !border-white/10 h-12 rounded-xl px-4 font-semibold text-lg"
                    />
                  </TextField>
                  <Button 
                    type="submit"
                    isDisabled={isLocked || !textAnswer.trim()}
                    className="w-full sm:w-auto h-12 px-10 bg-foreground text-background rounded-xl font-bold text-lg hover:bg-white transition-all active:scale-95"
                  >
                    Submit
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-8">
              <p className="text-foreground text-2xl sm:text-4xl font-bold tracking-tight animate-pulse italic">Answer submitted</p>
              <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">Waiting for everyone ({roundData.answerCount}/{players.length})</p>
            </div>
          )}
       </Card>
       <div className="pt-4">
          <Chip 
            size="lg"
            variant="soft"
            className="glass bg-white/5 border-white/[0.03] text-[10px] font-bold uppercase tracking-widest h-10 px-6"
          >
            Your wager: <span className="text-foreground ml-1">{roundData.wager} Points</span>
          </Chip>
       </div>
    </div>
  );
}
