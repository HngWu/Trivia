'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Question, Topic } from '@/lib/types/game';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Sparkles, 
  X, 
  Check, 
  AlertTriangle, 
  HelpCircle, 
  Lightbulb, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Upload
} from 'lucide-react';

interface QuestionManagerProps {
  topics: Topic[];
  questionCounts?: Record<string, number>;
  targetTopic: string;
  setTargetTopic: (val: string) => void;
  questions: Question[];
  onAddQuestion: (q: Question) => Promise<void>;
  onUpdateQuestion: (id: string, updates: Partial<Question>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onUploadBatch: (topic: string, questions: Question[]) => Promise<void>;
  isGenerating: boolean;
  onGenerateAI: (topic: string, provider: string, count: number) => Promise<Question[]>;
}

const ITEMS_PER_PAGE = 12;

export default function QuestionManager({
  topics,
  questionCounts = {},
  targetTopic,
  setTargetTopic,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onUploadBatch,
  isGenerating,
  onGenerateAI,
}: QuestionManagerProps) {
  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<Question | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formTopic, setFormTopic] = useState('');
  const [formText, setFormText] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formType, setFormType] = useState<Question['type']>('text');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('');
  const [formExplanation, setFormExplanation] = useState('');

  // AI & Batch State
  const [aiProvider, setAiProvider] = useState('auto');
  const [aiCount, setAiCount] = useState(10);
  const [aiTopic, setAiTopic] = useState(targetTopic || (topics[0]?.id ?? ''));
  const [batchJson, setBatchJson] = useState('');

  // Keep aiTopic synced if targetTopic changes
  useEffect(() => {
    if (targetTopic) setAiTopic(targetTopic);
  }, [targetTopic]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, targetTopic]);

  // Total question count across all topics
  const totalQuestionsCount = useMemo(() => {
    return Object.values(questionCounts).reduce((a, b) => a + b, 0);
  }, [questionCounts]);

  // Client-side filtering
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Type filter
      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesText = q.text.toLowerCase().includes(query);
        const matchesSummary = q.summary ? q.summary.toLowerCase().includes(query) : false;
        const matchesAnswer = q.correct_answer.toLowerCase().includes(query);
        const matchesOptions = q.options ? q.options.some(o => o.toLowerCase().includes(query)) : false;
        if (!matchesText && !matchesSummary && !matchesAnswer && !matchesOptions) {
          return false;
        }
      }
      return true;
    });
  }, [questions, selectedType, search]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // Type Breakdown Counts for the current view
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: questions.length, multiple_choice: 0, boolean: 0, boolean_yes_no: 0, text: 0 };
    for (const q of questions) {
      counts[q.type] = (counts[q.type] || 0) + 1;
    }
    return counts;
  }, [questions]);

  // Open Add Question Modal
  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormTopic(targetTopic || topics[0]?.id || 'history');
    setFormText('');
    setFormSummary('');
    setFormType('multiple_choice');
    setFormOptions(['', '', '', '']);
    setFormCorrectAnswer('');
    setFormExplanation('');
    setIsFormModalOpen(true);
  };

  // Open Edit Question Modal
  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormTopic(q.topic || '');
    setFormText(q.text);
    setFormSummary(q.summary || '');
    setFormType(q.type);
    setFormOptions(q.options && q.options.length >= 4 ? q.options : ['', '', '', '']);
    setFormCorrectAnswer(q.correct_answer);
    setFormExplanation(q.explanation || '');
    setIsFormModalOpen(true);
  };

  // Open Duplicate Question Modal (clones into create modal)
  const openDuplicateModal = (q: Question) => {
    setEditingQuestion(null);
    setFormTopic(q.topic || '');
    setFormText(`${q.text} (Copy)`);
    setFormSummary(q.summary ? `${q.summary} (Copy)` : '');
    setFormType(q.type);
    setFormOptions(q.options ? [...q.options] : ['', '', '', '']);
    setFormCorrectAnswer(q.correct_answer);
    setFormExplanation(q.explanation || '');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim() || !formCorrectAnswer.trim() || !formTopic) return;

    setIsSubmitting(true);
    try {
      const payload: Question = {
        id: editingQuestion ? editingQuestion.id : '',
        topic: formTopic,
        summary: formSummary.trim() || 'General Round',
        text: formText.trim(),
        type: formType,
        options: formType === 'multiple_choice' ? formOptions.map(o => o.trim()).filter(Boolean) : null,
        correct_answer: formCorrectAnswer.trim(),
        explanation: formExplanation.trim() || undefined
      };

      if (editingQuestion) {
        await onUpdateQuestion(editingQuestion.id, payload);
      } else {
        await onAddQuestion(payload);
      }
      setIsFormModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmQuestion) return;
    setIsSubmitting(true);
    try {
      await onDeleteQuestion(deleteConfirmQuestion.id);
      setDeleteConfirmQuestion(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunAi = async () => {
    if (!aiTopic) return;
    try {
      const generated = await onGenerateAI(aiTopic, aiProvider, aiCount);
      if (generated && generated.length > 0) {
        setBatchJson(JSON.stringify(generated, null, 2));
      }
    } catch {
      /* Handled by caller */
    }
  };

  const handleUploadBatchJson = async () => {
    if (!aiTopic || !batchJson.trim()) return;
    try {
      const parsed = JSON.parse(batchJson);
      const items = (Array.isArray(parsed) ? parsed : [parsed]) as Question[];
      await onUploadBatch(aiTopic, items);
      setBatchJson('');
      setIsAiModalOpen(false);
    } catch {
      alert('Invalid JSON syntax. Please verify before uploading.');
    }
  };

  const handleTemplateLoad = () => {
    const template = [
      {
        summary: "World History",
        text: "In which year did the Apollo 11 mission land on the Moon?",
        type: "multiple_choice",
        options: ["1967", "1969", "1971", "1973"],
        correct_answer: "1969",
        explanation: "Apollo 11 landed on the lunar surface on July 20, 1969."
      },
      {
        summary: "Planetary Science",
        text: "Venus rotates in the opposite direction to most planets in the solar system.",
        type: "boolean",
        correct_answer: "True",
        explanation: "Venus has retrograde rotation, spinning from east to west."
      }
    ];
    setBatchJson(JSON.stringify(template, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* 1. TOPIC CHIPS NAVIGATOR */}
      <div className="glass p-4 rounded-3xl border-white/5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Arenas & Pools</span>
          </span>
          <span className="text-[10px] text-gray-500 font-medium">
            Total Questions: <span className="text-white font-bold">{totalQuestionsCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
          <button
            onClick={() => setTargetTopic('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              targetTopic === ''
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>All Arenas</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${targetTopic === '' ? 'bg-black/15 text-black' : 'bg-white/10 text-gray-300'}`}>
              {totalQuestionsCount}
            </span>
          </button>

          {topics.map(t => {
            const count = questionCounts[t.id.toLowerCase()] || 0;
            const isSelected = targetTopic === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setTargetTopic(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{t.icon || '📜'}</span>
                <span>{t.name}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  isSelected ? 'bg-black/15 text-black' : count === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass p-5 rounded-3xl border-white/5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Live Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question pool..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 glass-input rounded-xl pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                selectedType === 'all'
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All ({typeCounts.all})
            </button>
            <button
              onClick={() => setSelectedType('multiple_choice')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                selectedType === 'multiple_choice'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              MC ({typeCounts.multiple_choice})
            </button>
            <button
              onClick={() => setSelectedType('boolean')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                selectedType === 'boolean'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              T/F ({typeCounts.boolean})
            </button>
            <button
              onClick={() => setSelectedType('boolean_yes_no')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                selectedType === 'boolean_yes_no'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              Y/N ({typeCounts.boolean_yes_no})
            </button>
            <button
              onClick={() => setSelectedType('text')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                selectedType === 'text'
                  ? 'bg-amber-500 text-black'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              Text ({typeCounts.text})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="h-10 px-4 rounded-xl border border-white/10 text-gray-300 font-bold text-xs hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI & Batch</span>
          </button>

          <button
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all flex items-center gap-2 shadow-lg shadow-white/5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* 3. QUESTION CARDS LIST */}
      {filteredQuestions.length === 0 ? (
        <div className="glass p-12 rounded-3xl border-white/5 text-center space-y-3">
          <HelpCircle className="w-8 h-8 text-gray-500 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Questions Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search || selectedType !== 'all'
              ? 'No questions match your current search or type filter. Try resetting filters.'
              : targetTopic
              ? `No questions currently exist in the "${targetTopic}" arena. Add questions manually or generate with AI.`
              : 'No questions exist in the system yet. Click "Add Question" to start building your pool.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {paginatedQuestions.map((q, idx) => {
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
              const isMultipleChoice = q.type === 'multiple_choice';

              return (
                <div
                  key={q.id}
                  className="glass p-5 rounded-2xl border-white/5 hover:border-white/15 transition-all space-y-3 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-500 font-bold">
                          #{globalIndex}
                        </span>

                        {/* Type Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          q.type === 'multiple_choice' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : q.type.startsWith('boolean') 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {q.type.replace('_', ' ')}
                        </span>

                        {/* Arena Badge */}
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-gray-400 border border-white/5">
                          #{q.topic}
                        </span>

                        {/* Summary / Round Title */}
                        {q.summary && (
                          <span className="text-xs font-semibold text-gray-300">
                            &bull; {q.summary}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                        {q.text}
                      </h4>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Edit question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDuplicateModal(q)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Duplicate question"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmQuestion(q)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Multiple Choice Grid */}
                  {isMultipleChoice && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                        return (
                          <div
                            key={optIdx}
                            className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                                : 'bg-white/[0.02] border-white/5 text-gray-400'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-400'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>
                            {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Non-MC Answer Badge */}
                  {!isMultipleChoice && (
                    <div className="flex items-center gap-2 text-xs pt-1">
                      <span className="text-gray-500 font-medium">Correct Answer:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                        {q.correct_answer}
                      </span>
                    </div>
                  )}

                  {/* Explanation Block */}
                  {q.explanation && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 italic">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400/70 shrink-0 mt-0.5" />
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4. PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 glass rounded-2xl border-white/5 text-xs text-gray-400">
              <div>
                Showing <span className="text-white font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="text-white font-bold">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)}
                </span>{' '}
                of <span className="text-white font-bold">{filteredQuestions.length}</span> questions
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-bold text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. IN-PLACE ADD / EDIT QUESTION MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass max-w-2xl w-full rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-foreground">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Arena (Topic) *
                  </label>
                  <select
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    required
                    className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id} className="bg-background text-foreground">
                        {t.icon} {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Question Type *
                  </label>
                  <select
                    value={formType}
                    onChange={e => {
                      const newType = e.target.value as Question['type'];
                      setFormType(newType);
                      if (newType === 'boolean' && !['True', 'False'].includes(formCorrectAnswer)) {
                        setFormCorrectAnswer('True');
                      } else if (newType === 'boolean_yes_no' && !['Yes', 'No'].includes(formCorrectAnswer)) {
                        setFormCorrectAnswer('Yes');
                      }
                    }}
                    className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="multiple_choice" className="bg-background text-foreground">Multiple Choice (4 Options)</option>
                    <option value="boolean" className="bg-background text-foreground">True / False</option>
                    <option value="boolean_yes_no" className="bg-background text-foreground">Yes / No</option>
                    <option value="text" className="bg-background text-foreground">Open Text / Numerical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Question Text *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Which spacecraft carried the first humans to land on the Moon?"
                  value={formText}
                  onChange={e => setFormText(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs font-semibold text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-white/20 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Summary / Round Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Lunar Landing"
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Dynamic Answer Fields */}
              {formType === 'multiple_choice' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      4 Options (Click radio button next to correct answer) *
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formOptions.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isCorrect = formCorrectAnswer === opt && opt.trim() !== '';

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 glass p-2 rounded-xl border transition-all ${
                            isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setFormCorrectAnswer(opt)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                              isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-400 hover:text-white'
                            }`}
                            title={`Mark ${letter} as correct answer`}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            required
                            placeholder={`Option ${letter}`}
                            value={opt}
                            onChange={e => {
                              const newOpts = [...formOptions];
                              newOpts[i] = e.target.value;
                              setFormOptions(newOpts);
                              if (isCorrect) setFormCorrectAnswer(e.target.value);
                            }}
                            className="w-full bg-transparent text-xs font-medium text-foreground focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {!formCorrectAnswer && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Please select which option is the correct answer.</span>
                    </p>
                  )}
                </div>
              )}

              {formType === 'boolean' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Correct Answer *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormCorrectAnswer(val)}
                        className={`h-11 rounded-xl font-bold text-xs border transition-all ${
                          formCorrectAnswer === val
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'glass border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formType === 'boolean_yes_no' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Correct Answer *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Yes', 'No'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormCorrectAnswer(val)}
                        className={`h-11 rounded-xl font-bold text-xs border transition-all ${
                          formCorrectAnswer === val
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'glass border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formType === 'text' && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1969, Neil Armstrong, or France"
                    value={formCorrectAnswer}
                    onChange={e => setFormCorrectAnswer(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <p className="text-[10px] text-gray-500">
                    Supports fuzzy validation (&plusmn;1 on years/small integers, 2% tolerance on numbers, and surname matching).
                  </p>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Explanation / Fun Fact
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or rationale shown to players after the round..."
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-white/20 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 h-11 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formText.trim() || !formCorrectAnswer.trim()}
                  className="px-6 h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-white/5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingQuestion ? 'Update Question' : 'Save Question'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. AI & BATCH IMPORT MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass max-w-2xl w-full rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-foreground">
                  AI Question Generator & Batch Import
                </h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Generator Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Target Arena
                  </label>
                  <select
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    className="w-full h-10 glass-input rounded-xl px-3 text-xs font-semibold bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id} className="bg-background text-foreground">
                        {t.icon} {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    AI Engine
                  </label>
                  <select
                    value={aiProvider}
                    onChange={e => setAiProvider(e.target.value)}
                    className="w-full h-10 glass-input rounded-xl px-3 text-xs font-semibold bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <option value="auto" className="bg-background text-foreground">Auto (Gemini &rarr; DeepSeek)</option>
                    <option value="gemini" className="bg-background text-foreground">Google Gemini 2.0 Flash</option>
                    <option value="deepseek" className="bg-background text-foreground">DeepSeek Chat</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Batch Count ({aiCount})
                  </label>
                  <div className="flex items-center gap-2 h-10 glass-input rounded-xl px-3">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={aiCount}
                      onChange={e => setAiCount(parseInt(e.target.value) || 10)}
                      className="w-full accent-foreground cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunAi}
                  disabled={isGenerating || !aiTopic}
                  className="px-5 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating with AI...' : `Generate ${aiCount} Questions`}</span>
                </button>
              </div>

              {/* JSON Editor */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    JSON Array Editor
                  </label>
                  <button
                    type="button"
                    onClick={handleTemplateLoad}
                    className="text-[10px] font-bold text-white/50 hover:text-white underline transition-colors"
                  >
                    Load Sample Template
                  </button>
                </div>
                <textarea
                  rows={8}
                  placeholder="Paste or generate JSON array of questions..."
                  value={batchJson}
                  onChange={e => setBatchJson(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 font-mono text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-white/20 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-5 h-11 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadBatchJson}
                  disabled={!batchJson.trim()}
                  className="px-6 h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-white/5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Save Batch to Arena</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteConfirmQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl border border-red-500/20 shadow-2xl p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">Delete Question</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to delete this question?
              </p>
              <p className="text-xs font-semibold text-white bg-white/5 p-2.5 rounded-xl text-left line-clamp-2">
                &ldquo;{deleteConfirmQuestion.text}&rdquo;
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmQuestion(null)}
                className="flex-1 h-11 rounded-xl text-xs font-bold border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
