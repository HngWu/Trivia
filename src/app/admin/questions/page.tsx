'use client';

import React, { useState, useEffect } from 'react';
import { getTopics, addQuestions, deleteQuestion, updateQuestion, getQuestionsByTopic } from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import QuestionManager from '@/components/admin/QuestionManager';

import { Topic, Question } from '@/lib/types/game';

export default function AdminQuestionsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [targetTopic, setTargetTopic] = useState('');
  const [batchJson, setBatchJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTopics().then(data => {
      setTopics(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (targetTopic) {
      getQuestionsByTopic(targetTopic).then(setQuestions);
    } else {
      // Use requestAnimationFrame to avoid cascading render warning in this strict environment
      requestAnimationFrame(() => setQuestions([]));
    }
  }, [targetTopic]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerateAI = async (provider: string, count: number) => {
    if (!targetTopic) return;
    setIsGenerating(true);
    
    // Send existing question texts to AI to avoid duplicates and save tokens
    const excluded = questions.map(q => q.text);
    
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: targetTopic, provider, count, excluded }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // Pretty print JSON with 2-space indentation
      setBatchJson(JSON.stringify(data.questions, null, 2));
      showToast(`Generated ${data.questions.length} unique questions.`);
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
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
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Invalid JSON or server error: " + err.message);
    }
  };

  const handleUpdateQuestion = async (id: string, updates: Partial<Question>) => {
    try {
      await updateQuestion(id, updates);
      setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
      showToast("Question updated.");
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
      showToast("Question deleted.");
    } catch (e: unknown) {
      const err = e as Error;
      showToast(err.message);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center p-20 font-bold animate-pulse text-gray-500">Loading intelligence...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Intelligence</h2>
        <p className="text-gray-500 text-xs">Build the question pool for each arena using AI or manual entry.</p>
      </div>
      <QuestionManager 
        topics={topics} 
        targetTopic={targetTopic} 
        setTargetTopic={setTargetTopic} 
        batchJson={batchJson} 
        setBatchJson={setBatchJson} 
        isGenerating={isGenerating} 
        onGenerate={handleGenerateAI} 
        onUpload={handleBatchAdd} 
        questions={questions} 
        onDeleteQuestion={handleDeleteQuestion} 
        onUpdateQuestion={handleUpdateQuestion} 
      />
    </div>
  );
}
