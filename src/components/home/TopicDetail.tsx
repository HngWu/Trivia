import React from 'react';

import { Topic } from '@/lib/types/game';
import { GlassButton } from '../shared/GlassButton';

interface TopicDetailProps {
  topicData: Topic;
  nickname: string;
  setNickname: (val: string) => void;
  customTopic: string;
  setCustomTopic: (val: string) => void;
  onBack: () => void;
  onCreate: () => void;
  isLoading: boolean;
}

export default function TopicDetail({ 
  topicData, 
  nickname, 
  setNickname, 
  customTopic, 
  setCustomTopic, 
  onBack, 
  onCreate, 
  isLoading
}: TopicDetailProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && nickname && (topicData.id !== 'custom' || customTopic)) {
      onCreate();
    }
  };

  return (
    <section className="glass w-full max-w-2xl mx-auto p-6 rounded-3xl animate-slide-up space-y-4 border-white/10 shadow-xl relative overflow-hidden">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-muted-foreground hover:text-foreground mb-6 transition-colors focus:ring-2 focus:ring-white/20 focus:outline-none"
      >
        ← Back to topics
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{topicData.icon}</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{topicData.name}</h3>
        </div>
        <p className="text-sm font-medium text-muted-foreground leading-snug">
          {topicData.description}
        </p>
      </div>

      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
        <span className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground block uppercase">Example question</span>
        <p className="italic text-foreground font-semibold text-base sm:text-lg leading-tight">
          &quot;{topicData.example_question}&quot;
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topicData.id === 'custom' && (
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Topic name</label>
              <input
                type="text"
                required
                placeholder="e.g. 90s Music"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full h-10 glass-input rounded-xl px-4 font-semibold text-base text-foreground focus:ring-2 focus:ring-white/20 focus:outline-none"
              />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Your name</label>
            <input
              type="text"
              required
              placeholder="Enter nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full h-10 glass-input rounded-xl px-4 font-semibold text-base text-foreground focus:ring-2 focus:ring-white/20 focus:outline-none"
            />
          </div>
        </div>

        <GlassButton
          type="submit"
          disabled={!nickname || (topicData.id === 'custom' && !customTopic) || isLoading}
          className="w-full py-4 rounded-xl font-bold text-lg"
        >
          {isLoading ? 'Starting game...' : 'Create room'}
        </GlassButton>
      </form>
    </section>
  );
}
