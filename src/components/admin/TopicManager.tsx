import React from 'react';

import { Topic } from '@/lib/types/game';

interface TopicManagerProps {
  topics: Topic[];
  newTopic: Topic;
  setNewTopic: (val: Topic) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Topic>) => void;
}

export default function TopicManager({ topics, newTopic, setNewTopic, onAdd, onDelete, onUpdate }: TopicManagerProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setNewTopic(topic);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewTopic({ id: '', name: '', icon: '', description: '', example_question: '' });
  };

  const handleSave = () => {
    if (editingId) {
      onUpdate(editingId, newTopic);
      setEditingId(null);
      setNewTopic({ id: '', name: '', icon: '', description: '', example_question: '' });
    } else {
      onAdd();
    }
  };

  return (
    <section className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-500 tracking-tight">{editingId ? 'Edit topic' : 'Manage topics'}</h2>
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
           <input 
             type="text" 
             required
             disabled={!!editingId}
             placeholder="ID (e.g. history)" 
             value={newTopic.id}
             onChange={e => setNewTopic({...newTopic, id: e.target.value})}
             className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground disabled:opacity-50 focus:ring-2 focus:ring-white/10"
           />
           <input 
             type="text" 
             required
             placeholder="Name" 
             value={newTopic.name}
             onChange={e => setNewTopic({...newTopic, name: e.target.value})}
             className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground focus:ring-2 focus:ring-white/10"
           />
        </div>
        <input 
          type="text" 
          required
          placeholder="Emoji icon" 
          value={newTopic.icon}
          onChange={e => setNewTopic({...newTopic, icon: e.target.value})}
          className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground focus:ring-2 focus:ring-white/10"
        />
        <textarea 
          placeholder="Description" 
          value={newTopic.description}
          onChange={e => setNewTopic({...newTopic, description: e.target.value})}
          className="w-full h-24 glass-input rounded-xl p-4 font-semibold text-sm resize-none text-foreground focus:ring-2 focus:ring-white/10"
        />
        <input 
          type="text" 
          placeholder="Example question" 
          value={newTopic.example_question}
          onChange={e => setNewTopic({...newTopic, example_question: e.target.value})}
          className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm italic text-foreground focus:ring-2 focus:ring-white/10"
        />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 h-11 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all focus:ring-2 focus:ring-white/20 focus:outline-none">
            {editingId ? 'Save changes' : 'Add topic'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 h-11 glass-button border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-xs focus:ring-2 focus:ring-white/20 focus:outline-none">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="pt-6 border-t border-white/[0.02] space-y-4">
        <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center uppercase">Current topics</h3>
        <div className="grid grid-cols-1 gap-2">
          {topics.map(t => (
            <div key={t.id} className="p-3 glass rounded-xl border-white/[0.02] flex items-center justify-between group hover:border-white/10 transition-all focus-within:ring-2 focus-within:ring-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-bold text-foreground">{t.name}</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button onClick={() => startEdit(t)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors focus:ring-2 focus:ring-white/20 focus:outline-none">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors focus:ring-2 focus:ring-red-500/20 focus:outline-none">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
