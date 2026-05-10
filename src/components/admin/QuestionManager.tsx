import React from 'react';
import { Question } from '@/lib/types/game';

interface QuestionManagerProps {
  topics: any[];
  targetTopic: string;
  setTargetTopic: (val: string) => void;
  batchJson: string;
  setBatchJson: (val: string) => void;
  isGenerating: boolean;
  onGenerate: (provider: string, count: number) => void;
  onUpload: () => void;
  questions: any[];
  onDeleteQuestion: (id: string) => void;
  onUpdateQuestion: (id: string, updates: any) => void;
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

  const handleEdit = (q: any) => {
    setEditingId(q.id);
    setBatchJson(JSON.stringify([q], null, 2));
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(batchJson);
      const updates = Array.isArray(parsed) ? parsed[0] : parsed;
      onUpdateQuestion(editingId!, updates);
      setEditingId(null);
      setBatchJson('');
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <section className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-500 tracking-tight">{editingId ? 'Edit question' : 'Add questions'}</h2>
        {!editingId && (
          <div className="flex gap-2 items-center">
             <div className="flex flex-col gap-1">
                <label className="text-[7px] font-bold text-gray-600 uppercase tracking-widest ml-1">Provider</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAIProvider(e.target.value)}
                  className="text-[9px] font-bold bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-400 outline-none"
                >
                  <option value="auto">Auto AI</option>
                  <option value="gemini">Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[7px] font-bold text-gray-600 uppercase tracking-widest ml-1">Count</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50"
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value) || 10)}
                  className="w-12 h-8 glass-input rounded-lg px-2 font-bold text-[10px] text-foreground outline-none"
                />
             </div>
             <button 
                onClick={() => onGenerate(aiProvider, aiCount)}
                disabled={!targetTopic || isGenerating}
                className={`text-[9px] font-bold tracking-widest px-4 py-2 rounded-full transition-all active:scale-95 border mt-3 ${isGenerating ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-foreground text-background hover:bg-white'}`}
              >
                {isGenerating ? "Generating..." : "Generate AI"}
              </button>
          </div>
        )}
      </div>
      
      <div className="space-y-5">
        {!editingId && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest text-gray-700 ml-1 uppercase">Select topic</label>
            <select 
              value={targetTopic}
              onChange={e => setTargetTopic(e.target.value)}
              className="w-full h-11 glass-input rounded-xl px-4 font-bold text-sm bg-transparent border-white/5 text-foreground"
            >
              <option value="" className="bg-background">Choose...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id} className="bg-background">{t.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase">JSON Data</label>
            {!editingId && (
              <button 
                onClick={() => setBatchJson(`[
  {
    "summary": "Example",
    "text": "Is this a test?",
    "type": "boolean",
    "correct_answer": "True",
    "explanation": "Correct."
  }
]`)}
                className="text-[9px] font-bold tracking-widest text-white/20 hover:text-foreground transition-colors"
              >
                Template
              </button>
            )}
          </div>
          <textarea 
            placeholder='JSON array of questions...'
            value={batchJson}
            onChange={e => setBatchJson(e.target.value)}
            className="w-full h-48 glass-input rounded-xl p-4 font-mono text-xs text-foreground resize-none border-white/5"
          />
        </div>
        
        {editingId ? (
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="flex-1 h-11 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all">Save changes</button>
            <button onClick={() => {setEditingId(null); setBatchJson('');}} className="px-4 h-11 glass-button border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-xs">Cancel</button>
          </div>
        ) : (
          <button 
            onClick={onUpload}
            disabled={!targetTopic || !batchJson || isGenerating}
            className="w-full h-11 glass-button bg-foreground text-background rounded-xl font-bold shadow-lg hover:bg-white transition-all"
          >
            Upload questions
          </button>
        )}
      </div>

      {targetTopic && !editingId && (
        <div className="pt-6 border-t border-white/[0.02] space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center uppercase">Current questions ({questions.length})</h3>
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
