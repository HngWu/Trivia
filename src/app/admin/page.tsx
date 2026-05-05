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

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase tracking-widest">Loading Admin...</div>;

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        <div className="glass p-12 rounded-[3rem] w-full max-w-md space-y-8 border-white/10 shadow-2xl">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Admin Access</h1>
            <p className="text-gray-500 font-bold tracking-[0.3em] uppercase text-[10px]">Identify yourself</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 glass-input rounded-xl px-6 text-lg font-black italic tracking-tighter placeholder:text-gray-700 text-white" 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 glass-input rounded-xl px-6 text-lg font-black italic tracking-tighter placeholder:text-gray-700 text-white" 
            />
            <button className="w-full h-12 bg-white text-black rounded-xl font-black uppercase italic tracking-tighter hover:bg-gray-200 transition-all">Sign In</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 sm:p-12 space-y-16">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <header className="flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Control Center</h1>
        <button 
          onClick={() => supabase.auth.signOut().then(() => setUser(null))}
          className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Topic Management */}
        <section className="glass p-8 sm:p-10 rounded-[2.5rem] border-white/10 space-y-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-500">Manage Topics</h2>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="ID (e.g. history)" 
              value={newTopic.id}
              onChange={e => setNewTopic({...newTopic, id: e.target.value})}
              className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white text-sm"
            />
            <input 
              type="text" 
              placeholder="Name" 
              value={newTopic.name}
              onChange={e => setNewTopic({...newTopic, name: e.target.value})}
              className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white text-sm"
            />
            <input 
              type="text" 
              placeholder="Emoji Icon" 
              value={newTopic.icon}
              onChange={e => setNewTopic({...newTopic, icon: e.target.value})}
              className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white text-sm"
            />
            <textarea 
              placeholder="Description" 
              value={newTopic.description}
              onChange={e => setNewTopic({...newTopic, description: e.target.value})}
              className="w-full h-24 glass-input rounded-xl p-4 font-bold text-white text-sm resize-none"
            />
            <input 
              type="text" 
              placeholder="Example Question" 
              value={newTopic.example_question}
              onChange={e => setNewTopic({...newTopic, example_question: e.target.value})}
              className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white text-sm"
            />
            <button onClick={handleAddTopic} className="w-full h-12 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Add Topic</button>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Existing Topics</h3>
            <div className="grid grid-cols-2 gap-2">
              {topics.map(t => (
                <div key={t.id} className="p-3 glass rounded-xl border-white/5 flex items-center gap-2">
                  <span>{t.icon}</span>
                  <span className="text-[10px] font-black uppercase truncate">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Question Management */}
        <section className="glass p-8 sm:p-10 rounded-[2.5rem] border-white/10 space-y-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-500">Batch Add Questions</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Target Topic</label>
              <select 
                value={targetTopic}
                onChange={e => setTargetTopic(e.target.value)}
                className="w-full h-10 glass-input rounded-xl px-4 font-bold text-white text-sm bg-transparent"
              >
                <option value="" className="bg-black">Select Topic</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id} className="bg-black">{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">JSON Batch</label>
                <button 
                  onClick={() => setBatchJson(`[
  {
    "summary": "Example",
    "text": "Is this a question?",
    "type": "boolean",
    "correct_answer": "True",
    "explanation": "Yes it is."
  }
]`)}
                  className="text-[8px] font-black uppercase text-white/40 hover:text-white"
                >
                  Load Template
                </button>
              </div>
              <textarea 
                placeholder='[{"text": "...", "correct_answer": "..."}]'
                value={batchJson}
                onChange={e => setBatchJson(e.target.value)}
                className="w-full h-64 glass-input rounded-xl p-6 font-mono text-xs text-white resize-none"
              />
            </div>
            
            <button 
              onClick={handleBatchAdd}
              disabled={!targetTopic || !batchJson}
              className="w-full h-12 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-20"
            >
              Process Batch
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
