import React from 'react';

interface Topic {
  id: string;
  name: string;
  icon: string;
}

interface TopicManagerProps {
  topics: Topic[];
  newTopic: any;
  setNewTopic: (val: any) => void;
  onAdd: () => void;
}

export default function TopicManager({ topics, newTopic, setNewTopic, onAdd }: TopicManagerProps) {
  return (
    <section className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl">
      <h2 className="text-lg font-bold text-gray-500 tracking-tight">Manage topics</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
           <input 
             type="text" 
             placeholder="ID (e.g. history)" 
             value={newTopic.id}
             onChange={e => setNewTopic({...newTopic, id: e.target.value})}
             className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground"
           />
           <input 
             type="text" 
             placeholder="Name" 
             value={newTopic.name}
             onChange={e => setNewTopic({...newTopic, name: e.target.value})}
             className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground"
           />
        </div>
        <input 
          type="text" 
          placeholder="Emoji icon" 
          value={newTopic.icon}
          onChange={e => setNewTopic({...newTopic, icon: e.target.value})}
          className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm text-foreground"
        />
        <textarea 
          placeholder="Description" 
          value={newTopic.description}
          onChange={e => setNewTopic({...newTopic, description: e.target.value})}
          className="w-full h-20 glass-input rounded-xl p-4 font-semibold text-sm resize-none text-foreground"
        />
        <input 
          type="text" 
          placeholder="Example question" 
          value={newTopic.example_question}
          onChange={e => setNewTopic({...newTopic, example_question: e.target.value})}
          className="w-full h-11 glass-input rounded-xl px-4 font-semibold text-sm italic text-foreground"
        />
        <button onClick={onAdd} className="w-full h-11 glass-button bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all">Add topic</button>
      </div>

      <div className="pt-6 border-t border-white/[0.02] space-y-4">
        <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center uppercase">Current topics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {topics.map(t => (
            <div key={t.id} className="p-3 glass rounded-xl border-white/[0.02] flex items-center gap-2 group hover:border-white/10 transition-all">
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] font-bold truncate text-gray-400 group-hover:text-foreground">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
