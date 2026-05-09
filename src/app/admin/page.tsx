'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTopics, addTopic, addQuestions } from '@/lib/actions';
import Toast from '@/components/Toast';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  
  const [topics, setTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState({ id: '', name: '', icon: '', description: '', example_question: '' });
  
  const [targetTopic, setTargetTopic] = useState('');
  const [batchJson, setBatchJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const t = await getTopics();
        setTopics(t);
      }
      setIsLoading(false);
    };
    checkUser();
  }, [supabase]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerateAI = async () => {
    if (!targetTopic) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setBatchJson(JSON.stringify(data.questions, null, 2));
      showToast(`Generated 10 questions for ${targetTopic}`);
    } catch (e: any) {
      showToast("Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(error.message);
    } else {
      setUser(data.user);
      const t = await getTopics();
      setTopics(t);
    }
    setIsLoading(false);
  };

  const handleAddTopic = async () => {
    if (!newTopic.id || !newTopic.name) return;
    try {
      await addTopic(newTopic);
      setTopics([...topics, newTopic]);
      setNewTopic({ id: '', name: '', icon: '', description: '', example_question: '' });
      showToast("Topic added successfully!");
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleBatchAdd = async () => {
    if (!targetTopic || !batchJson) return;
    try {
      const parsed = JSON.parse(batchJson);
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      
      const formatted = questions.map(q => ({
        ...q,
        topic: targetTopic,
        options: q.options || null
      }));
      
      const result = await addQuestions(formatted);
      showToast(result.message);
      setBatchJson('');
    } catch (e: any) {
      showToast("Invalid JSON or server error: " + e.message);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold tracking-widest animate-pulse">Loading...</div>;

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 page-transition">
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        <div className="glass p-10 sm:p-12 rounded-[2.5rem] w-full max-w-md space-y-8 border-white/10 shadow-xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Admin login</h1>
            <p className="text-gray-500 font-medium text-xs">Enter credentials to manage game settings</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 glass-input rounded-xl px-4 font-medium" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 glass-input rounded-xl px-4 font-medium" 
            />
            <button className="w-full h-12 glass-button bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all">Sign In</button>
          </form>
          <button onClick={() => window.location.href = "/"} className="w-full text-[10px] font-bold tracking-widest text-gray-700 hover:text-white transition-colors">Back to Home</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-10 space-y-12 page-transition selection:bg-white/20">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <header className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Game management</h1>
          <p className="text-[10px] font-bold tracking-widest text-gray-600">Admin dashboard</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut().then(() => {
            setUser(null);
            window.location.href = "/";
          })}
          className="px-4 py-2 glass-button rounded-xl text-[10px] font-bold tracking-wider border-white/5 hover:text-red-500"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Topic Management */}
        <section className="glass p-8 rounded-[2rem] border-white/[0.03] space-y-8 shadow-xl">
          <h2 className="text-lg font-bold text-gray-500 tracking-tight">Manage topics</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <input 
                 type="text" 
                 placeholder="ID (e.g. history)" 
                 value={newTopic.id}
                 onChange={e => setNewTopic({...newTopic, id: e.target.value})}
                 className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm"
               />
               <input 
                 type="text" 
                 placeholder="Name" 
                 value={newTopic.name}
                 onChange={e => setNewTopic({...newTopic, name: e.target.value})}
                 className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm"
               />
            </div>
            <input 
              type="text" 
              placeholder="Emoji Icon" 
              value={newTopic.icon}
              onChange={e => setNewTopic({...newTopic, icon: e.target.value})}
              className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm"
            />
            <textarea 
              placeholder="Description" 
              value={newTopic.description}
              onChange={e => setNewTopic({...newTopic, description: e.target.value})}
              className="w-full h-24 glass-input rounded-xl p-4 font-semibold text-sm resize-none"
            />
            <input 
              type="text" 
              placeholder="Example Question" 
              value={newTopic.example_question}
              onChange={e => setNewTopic({...newTopic, example_question: e.target.value})}
              className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm italic"
            />
            <button onClick={handleAddTopic} className="w-full h-12 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all">Add topic</button>
          </div>

          <div className="pt-8 border-t border-white/[0.02] space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center">Current Topics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {topics.map(t => (
                <div key={t.id} className="p-3 glass rounded-xl border-white/[0.02] flex items-center gap-2 group hover:border-white/10 transition-all">
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-[10px] font-bold truncate text-gray-400 group-hover:text-white">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question Management */}
        <section className="glass p-8 rounded-[2rem] border-white/[0.03] space-y-8 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-500 tracking-tight">Add Questions</h2>
            <button 
              onClick={handleGenerateAI}
              disabled={!targetTopic || isGenerating}
              className={`text-[9px] font-bold tracking-widest px-4 py-2 rounded-full transition-all active:scale-95 border ${isGenerating ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-foreground text-background hover:bg-white'}`}
            >
              {isGenerating ? "Generating..." : "Auto-generate AI"}
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-gray-700 ml-1">Select topic</label>
              <select 
                value={targetTopic}
                onChange={e => setTargetTopic(e.target.value)}
                className="w-full h-12 glass-input rounded-xl px-4 font-bold text-sm bg-transparent border-white/5"
              >
                <option value="" className="bg-background">Choose...</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id} className="bg-background">{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold tracking-widest text-gray-700">JSON data</label>
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
                className="w-full h-64 glass-input rounded-xl p-6 font-mono text-xs text-foreground resize-none border-white/5"
              />
            </div>
            
            <button 
              onClick={handleBatchAdd}
              disabled={!targetTopic || !batchJson || isGenerating}
              className="w-full h-12 glass-button bg-foreground text-background rounded-xl font-bold shadow-lg hover:bg-white transition-all"
            >
              Upload questions
            </button>
          </div>
        </section>
      </div>

      <footer className="text-center pt-6">
        <p className="text-gray-800 text-[9px] font-bold tracking-[2em] opacity-30 pointer-events-none">
          TriviaDuel Admin
        </p>
      </footer>
    </main>
  );
}
