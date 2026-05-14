import React, { useState } from 'react';
import { Button, Card, Select, Slider, TextArea, Separator, ListBox, Label } from "@heroui/react";
import { Topic, Question } from "@/lib/types/game";

interface QuestionManagerProps {
  topics: Topic[];
  targetTopic: string;
  setTargetTopic: (val: string) => void;
  batchJson: string;
  setBatchJson: (val: string) => void;
  isGenerating: boolean;
  onGenerate: (provider: string, count: number) => void;
  onUpload: () => void;
  questions: Question[];
  onDeleteQuestion: (id: string) => void;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void;
}

export default function QuestionManager({ 
  topics, 
  targetTopic, 
  setTargetTopic, 
  batchJson, 
  setBatchJson, 
  isGenerating, 
  onGenerate, 
  onUpload,
  questions,
  onDeleteQuestion,
  onUpdateQuestion
}: QuestionManagerProps) {
  const [aiProvider, setAIProvider] = useState<string>('auto');
  const [aiCount, setAiCount] = useState<number>(10);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    // User-friendly JSON formatting (2 spaces indentation)
    setBatchJson(JSON.stringify([q], null, 2));
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(batchJson);
      const updates = Array.isArray(parsed) ? parsed[0] : parsed;
      onUpdateQuestion(editingId!, updates);
      setEditingId(null);
      setBatchJson('');
    } catch (error: unknown) {
      console.error("Save error:", error);
      // Removed toast.danger call as toast was not correctly imported or available in this way
    }
  };

  const handleTemplateLoad = () => {
    const template = [
      {
        "summary": "Protocol Test",
        "text": "Is this a test question?",
        "type": "boolean",
        "correct_answer": "True",
        "explanation": "System operational."
      }
    ];
    setBatchJson(JSON.stringify(template, null, 2));
  };

  return (
    <Card className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl h-full flex flex-col bg-transparent">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-500 tracking-tight">{editingId ? 'Edit question' : 'Add questions'}</h2>
        {!editingId && (
          <div className="flex gap-4 items-center">
             <Select 
               className="w-28"
               placeholder="Provider"
               value={aiProvider}
               onChange={(val) => setAIProvider(val as string)}
             >
               <Label className="text-[7px] font-bold text-gray-600 uppercase tracking-widest mb-0.5 ml-1">Provider</Label>
               <Select.Trigger className="glass !border-white/10 h-10 min-h-0 rounded-xl px-3 flex items-center">
                 <Select.Value className="text-[10px] font-bold" />
               </Select.Trigger>
               <Select.Popover>
                 <ListBox>
                   <ListBox.Item id="auto" textValue="Auto AI">Auto AI</ListBox.Item>
                   <ListBox.Item id="gemini" textValue="Gemini">Gemini</ListBox.Item>
                   <ListBox.Item id="deepseek" textValue="DeepSeek">DeepSeek</ListBox.Item>
                 </ListBox>
               </Select.Popover>
             </Select>

             <div className="w-24">
                <Slider 
                  maxValue={50} 
                  minValue={1} 
                  step={1}
                  value={aiCount}
                  onChange={(val) => setAiCount(val as number)}
                  className="max-w-md"
                >
                  <Label className="text-[7px] font-bold text-gray-600 uppercase tracking-widest mb-1">Count ({aiCount})</Label>
                  <Slider.Track className="h-1 bg-white/5 rounded-full">
                    <Slider.Fill className="bg-foreground" />
                    <Slider.Thumb className="size-3 bg-foreground border border-background" />
                  </Slider.Track>
                </Slider>
             </div>

             <Button 
                onPress={() => onGenerate(aiProvider, aiCount)}
                isDisabled={!targetTopic || isGenerating}
                isPending={isGenerating}
                variant={isGenerating ? "secondary" : "primary"}
                className={`h-10 font-bold tracking-widest px-4 rounded-xl transition-all text-[10px] uppercase ${isGenerating ? 'bg-white/5 text-gray-500' : 'bg-foreground text-background hover:bg-white'}`}
              >
                Generate AI
              </Button>
          </div>
        )}
      </div>
      
      <form 
        onSubmit={(e) => { 
          e.preventDefault(); 
          if (editingId) {
            handleSaveEdit();
          } else {
            onUpload();
          }
        }}
        className="space-y-4"
      >
        {!editingId && (
          <Select 
            className="w-full"
            placeholder="Choose a topic..."
            value={targetTopic}
            onChange={(val) => setTargetTopic(val as string)}
          >
            <Label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase mb-1 ml-1">Select topic</Label>
            <Select.Trigger className="glass !border-white/10 h-12 rounded-xl px-4 flex items-center">
              <Select.Value className="font-bold text-sm" />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {topics.map(t => (
                  <ListBox.Item key={t.id} id={t.id} textValue={t.name}>{t.name}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase">JSON Data</label>
            {!editingId && (
              <Button 
                size="sm" 
                variant="tertiary"
                onPress={handleTemplateLoad}
                className="text-[9px] font-bold tracking-widest text-white/20 hover:text-foreground transition-colors min-w-0 h-auto p-1"
              >
                Template
              </Button>
            )}
          </div>
          <TextArea 
            required
            placeholder='JSON array of questions...'
            value={batchJson}
            onChange={e => setBatchJson(e.target.value)}
            className="glass !border-white/10 p-4 rounded-xl shadow-inner min-h-[250px] font-mono text-xs leading-relaxed"
            rows={10}
          />
        </div>
        
        <div className="flex gap-2">
          {editingId ? (
            <>
              <Button 
                type="submit" 
                className="flex-1 h-12 bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all"
              >
                Save changes
              </Button>
              <Button 
                onPress={() => {setEditingId(null); setBatchJson('');}} 
                variant="outline"
                className="px-6 h-12 !border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-xs"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button 
              type="submit"
              isDisabled={!targetTopic || !batchJson || isGenerating}
              className="w-full h-12 bg-foreground text-background rounded-xl font-bold shadow-lg hover:bg-white transition-all"
            >
              Upload questions
            </Button>
          )}
        </div>
      </form>

      {targetTopic && !editingId && (
        <div className="pt-6 space-y-4">
          <Separator className="bg-white/[0.02]" />
          <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center uppercase">Current questions ({questions.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar py-2">
             {questions.map(q => (
               <Card key={q.id} className="p-3 glass rounded-xl border-white/[0.02] flex-row items-center justify-between group hover:border-white/10 transition-all bg-transparent shadow-none">
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                     <span className="text-[10px] font-bold text-foreground truncate">{q.text}</span>
                     <span className="text-[8px] font-bold text-gray-600 uppercase">{q.summary} • {q.correct_answer}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button 
                      isIconOnly 
                      size="sm" 
                      variant="tertiary"
                      onPress={() => handleEdit(q)} 
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </Button>
                    <Button 
                      isIconOnly 
                      size="sm" 
                      variant="danger"
                      onPress={() => onDeleteQuestion(q.id)} 
                      className="text-gray-500 hover:text-red-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </Button>
                  </div>
               </Card>
             ))}
          </div>
        </div>
      )}
    </Card>
  );
}
