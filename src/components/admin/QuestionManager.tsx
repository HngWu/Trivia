import React from 'react';

interface Topic {
  id: string;
  name: string;
}

interface QuestionManagerProps {
  topics: Topic[];
  targetTopic: string;
  setTargetTopic: (val: string) => void;
  batchJson: string;
  setBatchJson: (val: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onUpload: () => void;
}

export default function QuestionManager({ 
  topics, 
  targetTopic, 
  setTargetTopic, 
  batchJson, 
  setBatchJson, 
  isGenerating, 
  onGenerate, 
  onUpload 
}: QuestionManagerProps) {
  return (
    <section className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-500 tracking-tight">Add questions</h2>
        <button 
          onClick={onGenerate}
          disabled={!targetTopic || isGenerating}
          className={`text-[9px] font-bold tracking-widest px-4 py-2 rounded-full transition-all active:scale-95 border ${isGenerating ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-foreground text-background hover:bg-white'}`}
        >
          {isGenerating ? "Generating..." : "Auto-generate AI"}
        </button>
      </div>
      
      <div className="space-y-5">
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
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold tracking-widest text-gray-700 uppercase">JSON data</label>
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
          </div>
          <textarea 
            placeholder='JSON array of questions...'
            value={batchJson}
            onChange={e => setBatchJson(e.target.value)}
            className="w-full h-48 glass-input rounded-xl p-4 font-mono text-xs text-foreground resize-none border-white/5"
          />
        </div>
        
        <button 
          onClick={onUpload}
          disabled={!targetTopic || !batchJson || isGenerating}
          className="w-full h-11 glass-button bg-foreground text-background rounded-xl font-bold shadow-lg hover:bg-white transition-all"
        >
          Upload questions
        </button>
      </div>
    </section>
  );
}
