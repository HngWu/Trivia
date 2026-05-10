'use client';

import React, { useState, useEffect } from 'react';
import { getTopics, addTopic, deleteTopic, updateTopic } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import TopicManager from '@/components/admin/TopicManager';
import Link from 'next/link';

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState({ id: '', name: '', icon: '', description: '', example_question: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTopics().then(data => {
      setTopics(data);
      setIsLoading(false);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
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
      showToast("Topic deleted.");
    } catch (e: any) { showToast(e.message); }
  };

  if (isLoading) return <div className="flex items-center justify-center p-20 font-bold animate-pulse text-gray-500">Loading arenas...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Arenas</h2>
          <p className="text-gray-500 text-xs">Manage the domains of knowledge for the duel.</p>
        </div>
        <Link href="/admin" className="text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground transition-colors uppercase">
          ← Dashboard
        </Link>
      </div>
      <TopicManager 
        topics={topics} 
        newTopic={newTopic} 
        setNewTopic={setNewTopic} 
        onAdd={handleAddTopic} 
        onDelete={handleDeleteTopic} 
        onUpdate={handleUpdateTopic} 
      />
    </div>
  );
}
