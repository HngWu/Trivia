import { Database } from '../src/lib/types/database.types'

describe('Database Types', () => {
  it('defines the rooms table', () => {
    type RoomRow = Database['public']['Tables']['rooms']['Row'];
    const room: RoomRow = { 
      id: '1', 
      code: 'A1B2', 
      status: 'waiting', 
      leader_id: 'p1', 
      current_question_index: 0, 
      topic: 'History' 
    };
    expect(room.code).toBe('A1B2');
  });
});
