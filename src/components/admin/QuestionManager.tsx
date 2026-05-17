import React from 'react';
import { Question, Topic } from '@/lib/types/game';

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
  const [aiProvider, setAIProvider] = React.useState('auto');
  const [aiCount, setAiCount] = React.useState(10);
  const [editingId, setEditingId] = React.useState<string | null>(null);

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
      alert("Invalid JSON format. Please check your syntax.");
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
    <section className="glass p-6 sm:p-8 rounded-3xl border-white/[0.03] space-y-6 shadow-xl h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-muted-foreground tracking-tight">{editingId ? 'Edit question' : 'Add questions'}</h2>
        {!editingId && (
          <div className="flex gap-3 items-end">
             <div className="flex flex-col gap-1">
                <label className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Provider</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAIProvider(e.target.value)}
                  className="h-9 min-w-[80px] text-[10px] font-bold glass-input rounded-xl px-2 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none"
                >
                  <option value="auto" className="bg-background">Auto AI</option>
                  <option value="gemini" className="bg-background">Gemini</option>
                  <option value="deepseek" className="bg-background">DeepSeek</option>
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Count ({aiCount})</label>
                <div className="flex items-center gap-2 h-9 bg-white/5 border border-white/10 rounded-xl px-3 group focus-within:border-white/20 transition-all">
                   <input 
                     type="range" 
                     min="1" 
                     max="50"
                     value={aiCount}
                     onChange={(e) => setAiCount(parseInt(e.target.value) || 10)}
                     className="w-16 h-1 accent-foreground cursor-pointer"
                   />
                </div>
             </div>
             <button 
                type="button"
                onClick={() => onGenerate(aiProvider, aiCount)}
                disabled={!targetTopic || isGenerating}
                className={`h-9 font-bold tracking-widest px-4 rounded-xl transition-all active:scale-95 border text-[10px] uppercase focus:ring-2 focus:ring-white/20 focus:outline-none ${isGenerating ? 'bg-white/5 text-muted-foreground border-white/5' : 'bg-foreground text-background hover:bg-white'}`}
              >
                {isGenerating ? "..." : "Generate AI"}
              </button>
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Select topic</label>
            <select 
              required
              value={targetTopic}
              onChange={e => setTargetTopic(e.target.value)}
              className="w-full h-11 glass-input rounded-xl px-4 font-bold text-sm bg-transparent border-white/5 text-foreground appearance-none cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none"
            >
              <option value="" className="bg-background">Choose a topic...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id} className="bg-background">{t.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">JSON Data</label>
            {!editingId && (
              <button 
                type="button"
                onClick={handleTemplateLoad}
                className="text-[9px] font-bold tracking-widest text-white/20 hover:text-foreground transition-colors focus:outline-none"
              >
                Template
              </button>
            )}
          </div>
          <textarea 
            required
            placeholder='JSON array of questions...'
            value={batchJson}
            onChange={e => setBatchJson(e.target.value)}
            className="w-full h-64 glass-input rounded-xl p-6 font-mono text-xs text-foreground resize-none border-white/5 shadow-inner leading-relaxed focus:ring-2 focus:ring-white/20 focus:outline-none"
          />
        </div>
        
        {editingId ? (
          <div className="flex gap-2">
            <button type="submit" className="flex-1 h-11 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all focus:ring-2 focus:ring-white/20 focus:outline-none">Save changes</button>
            <button type="button" onClick={() => {setEditingId(null); setBatchJson('');}} className="px-4 h-11 glass-button border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-xs focus:ring-2 focus:ring-white/20 focus:outline-none">Cancel</button>
          </div>
        ) : (
          <button 
            type="submit"
            disabled={!targetTopic || !batchJson || isGenerating}
            className="w-full h-11 glass-button bg-foreground text-background rounded-xl font-bold shadow-lg hover:bg-white transition-all focus:ring-2 focus:ring-white/20 focus:outline-none"
          >
            Upload questions
          </button>
        )}
      </form>

      {targetTopic && !editingId && (
        <div className="pt-6 border-t border-white/[0.02] space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-muted-foreground text-center uppercase">Current questions ({questions.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
             {questions.map(q => (
               <div key={q.id} className="p-3 glass rounded-xl border-white/[0.02] flex items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex flex-col gap-1 min-w-0 pr-4">
                     <span className="text-[10px] font-bold text-foreground truncate">{q.text}</span>
                     <span className="text-[8px] font-bold text-gray-600 uppercase">{q.summary} • {q.correct_answer}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleEdit(q)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onDeleteQuestion(q.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </section>
  );
}
