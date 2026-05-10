import React from 'react';

interface TopicData {
  id: string;
  name: string;
  icon: string;
  description: string;
  example_question: string;
}

interface TopicDetailProps {
  topicData: TopicData;
  nickname: string;
  setNickname: (val: string) => void;
  customTopic: string;
  setCustomTopic: (val: string) => void;
  onBack: () => void;
  onCreate: () => void;
  isLoading: boolean;
  aiProvider: string;
  setAIProvider: (val: any) => void;
}

export default function TopicDetail({ 
  topicData, 
  nickname, 
  setNickname, 
  customTopic, 
  setCustomTopic, 
  onBack, 
  onCreate, 
  isLoading,
  aiProvider,
  setAIProvider
}: TopicDetailProps) {
  return (
    <section className="glass w-full max-w-2xl mx-auto p-5 rounded-[2rem] animate-slide-up space-y-5 border-white/10 shadow-xl relative overflow-hidden">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground mb-6 transition-colors"
      >
        ← Back to topics
      </button>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{topicData.icon}</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{topicData.name}</h3>
        </div>
        <p className="text-sm font-medium text-gray-400 leading-snug">
          {topicData.description}
        </p>
      </div>

      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-1.5">
        <span className="text-[9px] font-bold tracking-[0.2em] text-gray-600 block uppercase">Example question</span>
        <p className="italic text-foreground font-semibold text-base sm:text-lg leading-tight">
          &quot;{topicData.example_question}&quot;
        </p>
      </div>

      <div className="space-y-5 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topicData.id === 'custom' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-gray-600 ml-1 uppercase">Topic name</label>
                <input
                  type="text"
                  placeholder="e.g. 90s Music"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full h-10 glass-input rounded-xl px-4 font-semibold text-base text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-widest text-gray-600 ml-1 uppercase">AI Intelligence</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAIProvider(e.target.value)}
                  className="w-full h-10 glass-input rounded-xl px-4 font-bold text-sm bg-transparent border-white/5 text-foreground appearance-none"
                >
                  <option value="auto" className="bg-background">Auto Fallback</option>
                  <option value="gemini" className="bg-background">Google Gemini</option>
                  <option value="deepseek" className="bg-background">DeepSeek Chat</option>
                </select>
              </div>
            </>
          )}
          <div className={`space-y-1.5 ${topicData.id !== 'custom' ? 'sm:col-span-2' : ''}`}>
            <label className="text-[10px] font-bold tracking-widest text-gray-600 ml-1 uppercase">Your name</label>
            <input
              type="text"
              placeholder="Enter nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full h-10 glass-input rounded-xl px-4 font-semibold text-base text-foreground"
            />
          </div>
        </div>

        <button
          disabled={!nickname || (topicData.id === 'custom' && !customTopic) || isLoading}
          onClick={onCreate}
          className="w-full glass-button py-4 rounded-xl font-bold text-lg bg-foreground text-background hover:bg-white transition-all"
        >
          {isLoading ? 'Starting game...' : 'Create room'}
        </button>
      </div>
    </section>
  );
}
