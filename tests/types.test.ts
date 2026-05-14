import { Database } from '../src/lib/types/database.types'

describe('Database Types', () => {
  it('defines the topics table', () => {
    type TopicRow = Database['public']['Tables']['topics']['Row'];
    const topic: TopicRow = { 
      id: 'history', 
      name: 'History', 
      icon: '📜', 
      description: 'Test description', 
      example_question: 'Who discovered America?',
      created_at: new Date().toISOString()
    };
    expect(topic.name).toBe('History');
  });
});
