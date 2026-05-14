'use client';

import React, { useState } from 'react';
import { addTopic, deleteTopic, updateTopic } from '@/lib/actions';
import { toast } from "@heroui/react";
import TopicManager from '@/components/admin/TopicManager';

import { Topic } from '@/lib/types/game';

interface AdminTopicsClientProps {
  initialTopics: Topic[];
}

export default function AdminTopicsClient({ initialTopics }: AdminTopicsClientProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [newTopic, setNewTopic] = useState<Topic>({ id: '', name: '', icon: '', description: '', example_question: '' });

  const handleAddTopic = async () => {
    try {
      await addTopic(newTopic);
      setTopics([...topics, newTopic]);
      setNewTopic({ id: '', name: '', icon: '', description: '', example_question: '' });
      toast.success("Topic added successfully!");
    } catch (e: unknown) {
      const err = e as Error;
      toast.danger(err.message);
    }
  };

  const handleUpdateTopic = async (id: string, updates: Partial<Topic>) => {
    try {
      await updateTopic(id, updates);
      setTopics(topics.map(t => t.id === id ? { ...t, ...updates } : t));
      toast.success("Topic updated successfully!");
    } catch (e: unknown) {
      const err = e as Error;
      toast.danger(err.message);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Are you sure? This will delete all questions for this topic.")) return;
    try {
      await deleteTopic(id);
      setTopics(topics.filter(t => t.id !== id));
      toast.success("Topic deleted.");
    } catch (e: unknown) {
      const err = e as Error;
      toast.danger(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Arenas</h2>
        <p className="text-gray-500 text-xs">Manage the domains of knowledge for the duel.</p>
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
