'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTopics, addTopic, addQuestions, deleteTopic, updateTopic, deleteQuestion, updateQuestion, getQuestionsByTopic } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import AdminLogin from '@/components/admin/AdminLogin';
import TopicManager from '@/components/admin/TopicManager';
import QuestionManager from '@/components/admin/QuestionManager';

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
  const [questions, setQuestions] = useState<any[]>([]);

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

  useEffect(() => {
    if (targetTopic) {
      getQuestionsByTopic(targetTopic).then(setQuestions);
    } else {
      setQuestions([]);
    }
  }, [targetTopic]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerateAI = async (provider: string, count: number) => {
    if (!targetTopic) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic, provider, count }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setBatchJson(JSON.stringify(data.questions, null, 2));
      showToast(`Generated ${data.questions.length} questions for ${targetTopic}`);
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
    if (error) showToast(error.message);
    else {
      setUser(data.user);
      const t = await getTopics();
      setTopics(t);
    }
    setIsLoading(false);
  };

  const handleAddTopic = async () => {
    try {
      await addTopic(newTopic);
      setTopics([...topics, newTopic]);
      setNewTopic({ id: '', name: '', icon: '', description: '', example_question: '' });
      showToast("Topic added successfully!");
    } catch (e: any) { showToast(e.message); }
  };

  const handleUpdateTopic = async (id: string, updates: any) => {
    try {
      await updateTopic(id, updates);
      setTopics(topics.map(t => t.id === id ? updates : t));
      showToast("Topic updated successfully!");
    } catch (e: any) { showToast(e.message); }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Are you sure? This will delete all questions for this topic.")) return;
    try {
      await deleteTopic(id);
      setTopics(topics.filter(t => t.id !== id));
      if (targetTopic === id) setTargetTopic('');
      showToast("Topic deleted.");
    } catch (e: any) { showToast(e.message); }
  };

  const handleBatchAdd = async () => {
    if (!targetTopic || !batchJson) return;
    try {
      const parsed = JSON.parse(batchJson);
      const formatted = (Array.isArray(parsed) ? parsed : [parsed]).map(q => ({ ...q, topic: targetTopic, options: q.options || null }));
      const result = await addQuestions(formatted);
      showToast(result.message);
      setBatchJson('');
      getQuestionsByTopic(targetTopic).then(setQuestions);
    } catch (e: any) { showToast("Invalid JSON or server error: " + e.message); }
  };

  const handleUpdateQuestion = async (id: string, updates: any) => {
    try {
      await updateQuestion(id, updates);
      setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
      showToast("Question updated.");
    } catch (e: any) { showToast(e.message); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      showToast("Question deleted.");
    } catch (e: any) { showToast(e.message); }
  };

  if (isLoading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-bold tracking-widest animate-pulse">Loading...</div>;

  if (!user) return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} onLogin={handleLogin} />;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-8 space-y-8 page-transition selection:bg-white/20">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <header className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Game management</h1>
          <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">Admin Dashboard</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => { setUser(null); window.location.href = "/"; })} className="px-3 py-1.5 glass-button rounded-xl text-[10px] font-bold tracking-wider border-white/5 hover:text-red-500">Sign out</button>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <TopicManager topics={topics} newTopic={newTopic} setNewTopic={setNewTopic} onAdd={handleAddTopic} onDelete={handleDeleteTopic} onUpdate={handleUpdateTopic} />
        <QuestionManager topics={topics} targetTopic={targetTopic} setTargetTopic={setTargetTopic} batchJson={batchJson} setBatchJson={setBatchJson} isGenerating={isGenerating} onGenerate={handleGenerateAI} onUpload={handleBatchAdd} questions={questions} onDeleteQuestion={handleDeleteQuestion} onUpdateQuestion={handleUpdateQuestion} />
      </div>

      <footer className="text-center pt-4"><p className="text-gray-800 text-[9px] font-bold tracking-[2em] opacity-30 pointer-events-none uppercase">TriviaDuel Admin</p></footer>
    </main>
  );
}
