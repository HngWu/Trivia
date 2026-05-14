import React from 'react';
import { Button, Spinner } from "@heroui/react";

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
        <Spinner color="accent" size="lg" />
      </div>
    );
  }

  return (
    <section className="w-full max-w-4xl mx-auto space-y-6">
      <h2 className="text-center text-[10px] font-bold tracking-[0.4em] text-gray-600 uppercase">Select a topic</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <Button
            key={topic.id}
            onPress={() => onSelect(topic.id)}
            className={`group h-auto relative p-5 glass rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300 border border-white/[0.02] bg-transparent shadow-none min-w-0 ${
              selectedTopic === topic.id 
                ? 'border-foreground bg-white/10 scale-105 shadow-xl' 
                : 'hover:bg-white/[0.04] opacity-80 hover:opacity-100'
            }`}
          >
            <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">{topic.icon}</span>
            <span className="font-bold text-[13px] text-foreground tracking-wide">{topic.name}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
