'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Topic } from '@/lib/types/game';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  HelpCircle, 
  AlertTriangle, 
  X, 
  Check, 
  Sparkles 
} from 'lucide-react';

interface TopicManagerProps {
  topics: Topic[];
  questionCounts?: Record<string, number>;
  onAdd: (topic: Topic) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Topic>) => Promise<void>;
}

const POPULAR_EMOJIS = ['📜', '🔬', '🎬', '🌍', '🎮', '⚡', '🎨', '⚽', '🏛️', '📚', '💻', '🍕', '🚀', '🧠', '🎵'];

export default function TopicManager({
  topics,
  questionCounts = {},
  onAdd,
  onDelete,
  onUpdate,
}: TopicManagerProps) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleteConfirmTopic, setDeleteConfirmTopic] = useState<Topic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Topic>({
    id: '',
    name: '',
    icon: '📜',
    description: '',
    example_question: ''
  });

  // Filtered topics based on search
  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics;
    const query = search.toLowerCase().trim();
    return topics.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }, [topics, search]);

  const activeCount = useMemo(() => {
    return topics.filter(t => (questionCounts[t.id.toLowerCase()] || 0) > 0).length;
  }, [topics, questionCounts]);

  const emptyCount = useMemo(() => {
    return topics.filter(t => (questionCounts[t.id.toLowerCase()] || 0) === 0).length;
  }, [topics, questionCounts]);

  const openCreateModal = () => {
    setEditingTopic(null);
    setFormData({
      id: '',
      name: '',
      icon: '📜',
      description: '',
      example_question: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: Topic) => {
    setEditingTopic(t);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    if (!editingTopic) {
      // Auto-generate slug from name if creating
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, name, id: slug }));
    } else {
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.id.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingTopic) {
        await onUpdate(editingTopic.id, formData);
      } else {
        await onAdd(formData);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTopic) return;
    setIsSubmitting(true);
    try {
      await onDelete(deleteConfirmTopic.id);
      setDeleteConfirmTopic(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-5 rounded-3xl border-white/5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-foreground flex items-center gap-2">
            <span>Total Arenas:</span>
            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{topics.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active Pools:</span>
            <span className="font-bold text-emerald-300">{activeCount}</span>
          </div>
          {emptyCount > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Empty:</span>
              <span className="font-bold">{emptyCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search arenas..."
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

          <button
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all flex items-center gap-2 shrink-0 active:scale-95 shadow-lg shadow-white/5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Arena</span>
          </button>
        </div>
      </div>

      {/* Arenas Grid */}
      {filteredTopics.length === 0 ? (
        <div className="glass p-12 rounded-3xl border-white/5 text-center space-y-3">
          <HelpCircle className="w-8 h-8 text-gray-500 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Arenas Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search ? `No topic matches "${search}". Clear the search to see all arenas.` : 'No topics are currently defined. Click "Create Arena" above to create your first domain.'}
          </p>
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="text-xs font-semibold text-white/80 hover:text-white underline pt-2"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map(t => {
            const count = questionCounts[t.id.toLowerCase()] || 0;
            const isEmpty = count === 0;

            return (
              <div
                key={t.id}
                className="glass p-6 rounded-3xl border-white/5 hover:border-white/15 transition-all shadow-xl hover:shadow-2xl flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                      {t.icon || '📜'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-gray-400">
                        #{t.id}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-white transition-colors">
                      {t.name}
                    </h3>
                    {t.description ? (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600 italic mt-1">No description provided.</p>
                    )}
                  </div>

                  {t.example_question && (
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400 italic">
                      &ldquo;{t.example_question}&rdquo;
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center">
                    {isEmpty ? (
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        0 Questions
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {count} Question{count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/questions?topic=${t.id}`}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs flex items-center gap-1"
                      title="Manage Questions in this arena"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      title="Edit Arena"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmTopic(t)}
                      className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete Arena"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ARENA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-2xl w-full rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-foreground">
                  {editingTopic ? `Edit Arena: ${editingTopic.name}` : 'Create New Arena'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Arena Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ancient Rome"
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full h-11 glass-input rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Topic ID (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTopic}
                    placeholder="e.g. ancient-rome"
                    value={formData.id}
                    onChange={e => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                    className="w-full h-11 glass-input rounded-xl px-4 text-xs font-mono font-semibold text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              {/* Emoji Icon & Quick Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Arena Icon (Emoji) *
                  </label>
                  <span className="text-[10px] text-gray-500">Pick from quick list or type custom</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    value={formData.icon}
                    onChange={e => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-16 h-11 glass-input rounded-xl text-center text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 shrink-0"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {POPULAR_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                          formData.icon === emoji 
                            ? 'bg-white text-black scale-110 shadow-md font-bold' 
                            : 'bg-white/5 hover:bg-white/15 text-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  placeholder="A short engaging overview of what this arena tests..."
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full h-20 glass-input rounded-xl p-3 text-xs font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-white/20 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Sample / Example Question
                </label>
                <input
                  type="text"
                  placeholder="e.g. Which emperor built the Colosseum in Rome?"
                  value={formData.example_question || ''}
                  onChange={e => setFormData(prev => ({ ...prev, example_question: e.target.value }))}
                  className="w-full h-11 glass-input rounded-xl px-4 text-xs italic font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Live Card Preview Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Live Player Preview
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                    {formData.icon || '❓'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{formData.name || 'Untitled Arena'}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-1">{formData.description || 'No description yet.'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 h-11 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim() || !formData.id.trim()}
                  className="px-6 h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-white/5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingTopic ? 'Save Changes' : 'Create Arena'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl border border-red-500/20 shadow-2xl p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-foreground">Delete Arena</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">&ldquo;{deleteConfirmTopic.name}&rdquo;</span>? 
                This will permanently delete the topic and all questions inside this arena.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTopic(null)}
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
