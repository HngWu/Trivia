import { Button, Input, Card, TextField, Label } from "@heroui/react";

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
    <Card className="glass w-full max-w-2xl mx-auto p-5 rounded-[2rem] animate-slide-up space-y-5 border-white/10 shadow-xl relative overflow-hidden bg-transparent">
      <Button 
        variant="light"
        onPress={onBack}
        className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-500 hover:text-foreground mb-2 transition-colors min-w-0 h-auto p-0"
      >
        ← Back to topics
      </Button>

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

      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {topicData.id === 'custom' && (
            <div className="sm:col-span-2">
              <TextField name="customTopic" value={customTopic} onChange={setCustomTopic} isRequired>
                <Label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 ml-1">Topic name</Label>
                <Input
                  placeholder="e.g. 90s Music"
                  className="glass !border-white/10 h-11 rounded-xl px-4 font-semibold"
                />
              </TextField>
            </div>
          )}
          <div className="sm:col-span-2">
            <TextField name="nickname" value={nickname} onChange={setNickname} isRequired>
              <Label className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1 ml-1">Your name</Label>
              <Input
                placeholder="Enter nickname"
                className="glass !border-white/10 h-11 rounded-xl px-4 font-semibold"
              />
            </TextField>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!nickname || (topicData.id === 'custom' && !customTopic) || isLoading}
          className="w-full py-6 rounded-xl font-bold text-lg bg-foreground text-background hover:bg-white transition-all h-auto"
        >
          {isLoading ? 'Starting game...' : 'Create room'}
        </Button>
      </form>
    </Card>
  );
}
