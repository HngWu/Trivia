import { Database } from '../src/lib/types/database.types'

describe('Database Types', () => {
  it('defines the topics table', () => {
    type TopicRow = Database['public']['Tables']['topics']['Row'];
    const topic: TopicRow = { 
      id: '1', 
      name: 'History', 
      icon: '🏛️', 
      description: 'Historical events', 
      example_question: 'When did WWII end?', 
      created_at: '2023-01-01T00:00:00Z' 
    };
    expect(topic.name).toBe('History');
  });
});
