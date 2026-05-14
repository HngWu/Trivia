import React from 'react';

interface Topic {
  id: string;
  name: string;
  icon: string;
}

interface TopicGridProps {
  topics: Topic[];
  selectedTopic: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export default function TopicGrid({ topics, selectedTopic, onSelect, isLoading }: TopicGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 border-2 border-white/10 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto space-y-6">
      <h2 className="text-center text-[10px] font-bold tracking-[0.4em] text-gray-600 uppercase">Select a topic</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className={`group relative p-5 glass rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300 border border-white/[0.02] focus:ring-2 focus:ring-white/20 focus:outline-none ${
              selectedTopic === topic.id 
                ? 'border-foreground bg-white/10 scale-105 shadow-xl' 
                : 'hover:bg-white/[0.04] opacity-80 hover:opacity-100 hover:-translate-y-1 hover:scale-105 hover:shadow-lg'
            }`}
          >
            <span className="inline-block text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">{topic.icon}</span>
            <span className="inline-block font-bold text-[13px] text-foreground tracking-wide group-hover:scale-105 transition-transform duration-300">{topic.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
