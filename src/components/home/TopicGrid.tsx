import React from 'react';
import { motion } from 'framer-motion';

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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function TopicGrid({ topics, selectedTopic, onSelect, isLoading }: TopicGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-white/10 border-t-foreground rounded-full" 
        />
      </div>
    );
  }

  return (
    <motion.section 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      <motion.h2 variants={item} className="text-center text-[10px] font-bold tracking-[0.4em] text-gray-600 uppercase">Select a topic</motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {topics.map((topic) => (
          <motion.button
            variants={item}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            className={`group relative p-5 glass rounded-[1.5rem] flex flex-col items-center justify-center gap-3 transition-all duration-300 border border-white/[0.02] focus:ring-2 focus:ring-white/20 focus:outline-none ${
              selectedTopic === topic.id 
                ? 'border-foreground bg-white/10 scale-105 shadow-xl' 
                : 'hover:bg-white/[0.04] opacity-80 hover:opacity-100'
            }`}
          >
            <span className="text-3xl sm:text-4xl transition-transform duration-300 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{topic.icon}</span>
            <span className="font-bold text-[13px] text-foreground tracking-wide">{topic.name}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
