import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { Suspense } from 'react';
import { ThemeProvider } from '../src/components/ThemeProvider';

// Mock redis and gemini
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    hgetall: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
  },
}));

import RoomPage from '../src/app/room/[code]/page';
import * as actions from '../src/lib/actions';
import { createClient } from '../src/lib/supabase/client';

// Mock dependencies
jest.mock('../src/lib/actions');
jest.mock('../src/lib/supabase/client');

const mockedActions = actions as jest.Mocked<typeof actions>;
const mockedCreateClient = createClient as jest.Mock;

const mockQuestions = [
  {
    id: 'q1',
    summary: 'Question 1 Summary',
    text: 'What is the capital of France?',
    type: 'multiple_choice' as const,
    options: ['Paris', 'London', 'Berlin', 'Madrid'],
    correct_answer: 'Paris',
    explanation: 'Paris is the capital and largest city of France.'
  }
];

const mockPlayers = [
  { id: 'player-id', name: 'Player', score: 0, is_leader: true }
];

describe('Explanation Display', () => {
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockedCreateClient.mockReturnValue({
      channel: () => mockChannel,
      removeChannel: jest.fn(),
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('player-id'),
        setItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders the explanation during results phase', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'ROOM_CODE',
        status: 'results',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'player-id'
      },
      players: mockPlayers,
      allAnswers: [
        { player_id: 'player-id', question_id: 'q1', wager: 5, submitted_answer: 'Paris', is_correct: true }
      ]
    });

    const params = Promise.resolve({ code: 'ROOM_CODE' });
    
    await act(async () => {
      render(
        <ThemeProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <RoomPage params={params} />
          </Suspense>
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Paris is the capital and largest city of France./i)).toBeInTheDocument();
      expect(screen.getByText('Explanation')).toBeInTheDocument();
    });
  });
});
