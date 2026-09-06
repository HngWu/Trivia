'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getQuestionCountsByTopic, 
  getQuestionsByTopic, 
  getAllQuestions, 
  addQuestions, 
  updateQuestion, 
  deleteQuestion 
} from '@/lib/actions';
import Toast from '@/components/shared/Toast';
import QuestionManager from '@/components/admin/QuestionManager';
import { Topic, Question } from '@/lib/types/game';

interface AdminQuestionsClientProps {
  initialTopics: Topic[];
  initialQuestionCounts: Record<string, number>;
  initialTargetTopic: string;
  initialQuestions: Question[];
}

export default function AdminQuestionsClient({
  initialTopics,
  initialQuestionCounts,
  initialTargetTopic,
  initialQuestions,
}: AdminQuestionsClientProps) {
  const router = useRouter();

  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(initialQuestionCounts);
  const [targetTopic, setTargetTopicState] = useState<string>(initialTargetTopic);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // In-memory cache for visited topics so switching between them is instant (0ms)
  const questionsCache = useRef<Map<string, Question[]>>(new Map());

  // Seed cache with initial questions
  useEffect(() => {
    questionsCache.current.set(initialTargetTopic, initialQuestions);
  }, [initialTargetTopic, initialQuestions]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await getQuestionCountsByTopic();
      setQuestionCounts(counts || {});
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetTargetTopic = async (topicId: string) => {
    setTargetTopicState(topicId);
    const nextUrl = topicId ? `/admin/questions?topic=${encodeURIComponent(topicId)}` : '/admin/questions';
    router.push(nextUrl, { scroll: false });

    // Check client-side memory cache first
    if (questionsCache.current.has(topicId)) {
      setQuestions(questionsCache.current.get(topicId)!);
      return;
    }

    // Fetch from server action
    try {
      const data = topicId ? await getQuestionsByTopic(topicId) : await getAllQuestions(200);
      const safeData = data || [];
      questionsCache.current.set(topicId, safeData);
      setQuestions(safeData);
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Failed to load questions: " + err.message);
    }
  };

  const handleAddSingleQuestion = async (newQ: Question) => {
    try {
      const result = await addQuestions([newQ]);
      showToast(result.message);

      // Prepend to current questions
      setQuestions(prev => {
        const next = [newQ, ...prev];
        questionsCache.current.set(targetTopic, next);
        return next;
      });

      // Invalidate related topic cache if not current
      if (newQ.topic && newQ.topic !== targetTopic && questionsCache.current.has(newQ.topic)) {
        const cached = questionsCache.current.get(newQ.topic) || [];
        questionsCache.current.set(newQ.topic, [newQ, ...cached]);
      }

      refreshCounts();
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Failed to add question: " + err.message);
      throw err;
    }
  };

  const handleUpdateQuestion = async (id: string, updates: Partial<Question>) => {
    try {
      await updateQuestion(id, updates);
      setQuestions(prev => {
        const next = prev.map(q => q.id === id ? { ...q, ...updates } : q);
        questionsCache.current.set(targetTopic, next);
        return next;
      });
      showToast("Question updated successfully.");
      refreshCounts();
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Failed to update question: " + err.message);
      throw err;
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteQuestion(id);
      setQuestions(prev => {
        const next = prev.filter(q => q.id !== id);
        questionsCache.current.set(targetTopic, next);
        return next;
      });
      showToast("Question deleted.");
      refreshCounts();
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Failed to delete question: " + err.message);
      throw err;
    }
  };

  const handleBatchUpload = async (topic: string, batch: Question[]) => {
    try {
      const formatted = batch.map(q => ({
        ...q,
        topic,
        options: q.options || null
      }));
      const result = await addQuestions(formatted);
      showToast(result.message);

      // Clear cache for this topic to force refresh
      questionsCache.current.delete(topic);
      if (targetTopic === topic) {
        const refreshed = await getQuestionsByTopic(topic);
        questionsCache.current.set(topic, refreshed);
        setQuestions(refreshed);
      } else if (!targetTopic) {
        const all = await getAllQuestions(200);
        questionsCache.current.set('', all);
        setQuestions(all);
      }
      refreshCounts();
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Upload failed: " + err.message);
      throw err;
    }
  };

  const handleGenerateAI = async (topic: string, provider: string, count: number): Promise<Question[]> => {
    setIsGenerating(true);
    try {
      const excluded = questions.filter(q => q.topic === topic).map(q => q.text);
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, provider, count, excluded }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      showToast(`Generated ${data.questions.length} questions.`);
      return data.questions as Question[];
    } catch (e: unknown) {
      const err = e as Error;
      showToast("Generation failed: " + err.message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto py-4">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className="space-y-1">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Intelligence Pool</h2>
        <p className="text-gray-500 text-xs sm:text-sm">
          Inspect, filter, and expand the trivia question repository for each arena using AI or manual authoring.
        </p>
      </div>

      <QuestionManager
        topics={topics}
        questionCounts={questionCounts}
        targetTopic={targetTopic}
        setTargetTopic={handleSetTargetTopic}
        questions={questions}
        onAddQuestion={handleAddSingleQuestion}
        onUpdateQuestion={handleUpdateQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onUploadBatch={handleBatchUpload}
        isGenerating={isGenerating}
        onGenerateAI={handleGenerateAI}
      />
    </div>
  );
}
