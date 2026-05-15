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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className={`group relative p-5 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-500 focus:ring-2 focus:ring-white/20 focus:outline-none ${
              selectedTopic === topic.id 
                ? 'glass border-foreground bg-white/10 scale-105 shadow-xl border-2' 
                : 'glass-button opacity-90 hover:opacity-100'
            }`}
          >
            <span className={`inline-block transition-all duration-500 will-change-transform origin-center ${
              selectedTopic === topic.id
                ? "text-2xl sm:text-3xl"
                : "text-xl sm:text-2xl group-hover:scale-[2] group-hover:-translate-y-1 group-hover:text-white"
            }`}>
              {topic.icon}
            </span>
            <span className="font-bold text-[11px] text-foreground tracking-widest transition-all duration-500 group-hover:scale-105 group-hover:text-white uppercase pointer-events-none text-center leading-tight">
              {topic.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
