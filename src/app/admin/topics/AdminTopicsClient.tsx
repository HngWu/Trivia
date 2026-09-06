'use client';

import React, { useState } from 'react';
import { addTopic, deleteTopic, updateTopic } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import TopicManager from '@/components/admin/TopicManager';

import { Topic } from '@/lib/types/game';

interface AdminTopicsClientProps {
  initialTopics: Topic[];
  initialQuestionCounts?: Record<string, number>;
}

export default function AdminTopicsClient({ initialTopics, initialQuestionCounts = {} }: AdminTopicsClientProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(initialQuestionCounts);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddTopic = async (topic: Topic) => {
    try {
      await addTopic(topic);
      setTopics(prev => [...prev, topic]);
      setQuestionCounts(prev => ({ ...prev, [topic.id.toLowerCase()]: 0 }));
      showToast("Arena created successfully!");
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message); 
      throw e;
    }
  };

  const handleUpdateTopic = async (id: string, updates: Partial<Topic>) => {
    try {
      await updateTopic(id, updates);
      setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      showToast("Arena updated successfully!");
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message); 
      throw e;
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await deleteTopic(id);
      setTopics(prev => prev.filter(t => t.id !== id));
      setQuestionCounts(prev => {
        const next = { ...prev };
        delete next[id.toLowerCase()];
        return next;
      });
      showToast("Arena deleted successfully.");
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message); 
      throw e;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto py-4">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="space-y-1">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Knowledge Arenas</h2>
        <p className="text-gray-500 text-xs sm:text-sm">Create, configure, and inspect the trivia domains available to players in duel matches.</p>
      </div>
      <TopicManager 
        topics={topics} 
        questionCounts={questionCounts}
        onAdd={handleAddTopic} 
        onDelete={handleDeleteTopic} 
        onUpdate={handleUpdateTopic} 
      />
    </div>
  );
}
