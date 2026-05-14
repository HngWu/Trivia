import React from 'react';
import { Topic } from '@/lib/types/game';
import { Button, Card, Input, TextArea, Separator, TextField } from "@heroui/react";

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
    <Card className="glass p-6 sm:p-8 rounded-[2rem] border-white/[0.03] space-y-6 shadow-xl h-full flex flex-col bg-transparent">
      <h2 className="text-lg font-bold text-gray-500 tracking-tight">{editingId ? 'Edit topic' : 'Manage topics'}</h2>
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
           <TextField isDisabled={!!editingId} value={newTopic.id} onChange={val => setNewTopic({...newTopic, id: val})}>
             <Input 
               required
               placeholder="ID (e.g. history)" 
               className="glass !border-white/10 h-11 rounded-xl px-3 font-semibold"
             />
           </TextField>
           <TextField value={newTopic.name} onChange={val => setNewTopic({...newTopic, name: val})}>
             <Input 
               required
               placeholder="Name" 
               className="glass !border-white/10 h-11 rounded-xl px-3 font-semibold"
             />
           </TextField>
        </div>
        <TextField value={newTopic.icon} onChange={val => setNewTopic({...newTopic, icon: val})}>
          <Input 
            required
            placeholder="Emoji icon" 
            className="glass !border-white/10 h-11 rounded-xl px-3 font-semibold"
          />
        </TextField>
        <TextField value={newTopic.description} onChange={val => setNewTopic({...newTopic, description: val})}>
          <TextArea 
            placeholder="Description" 
            className="glass !border-white/10 rounded-xl p-3 font-semibold"
            rows={3}
          />
        </TextField>
        <TextField value={newTopic.example_question} onChange={val => setNewTopic({...newTopic, example_question: val})}>
          <Input 
            placeholder="Example question" 
            className="glass !border-white/10 h-11 rounded-xl px-3 font-semibold italic"
          />
        </TextField>
        <div className="flex gap-2">
          <Button 
            type="submit" 
            className="flex-1 h-12 bg-foreground text-background rounded-xl font-bold hover:bg-white transition-all"
          >
            {editingId ? 'Save changes' : 'Add topic'}
          </Button>
          {editingId && (
            <Button 
              onPress={cancelEdit} 
              variant="bordered"
              className="px-6 h-12 !border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="pt-6 space-y-4">
        <Separator className="bg-white/[0.02]" />
        <h3 className="text-[10px] font-bold tracking-widest text-gray-700 text-center uppercase">Current topics</h3>
        <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px] no-scrollbar pr-1">
          {topics.map(t => (
            <Card key={t.id} className="p-3 glass rounded-xl border-white/[0.02] flex-row items-center justify-between group hover:border-white/10 transition-all bg-transparent shadow-none">
              <div className="flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-bold text-foreground">{t.name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  isIconOnly 
                  size="sm" 
                  variant="light"
                  onPress={() => startEdit(t)} 
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </Button>
                <Button 
                  isIconOnly 
                  size="sm" 
                  variant="light"
                  color="danger"
                  onPress={() => onDelete(t.id)} 
                  className="text-gray-500 hover:text-red-500"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}
