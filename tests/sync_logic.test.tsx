import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { Suspense } from 'react';
import { ThemeProvider } from '../src/components/ThemeProvider';

// Mock redis and gemini BEFORE importing components that might use them
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
jest.mock('../src/lib/gemini', () => ({
  generateQuestions: jest.fn(),
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
    type: 'multiple_choice',
    options: ['Paris', 'London', 'Berlin', 'Madrid'],
    correct_answer: 'Paris'
  }
];

const mockPlayers = [
  { id: 'leader-id', name: 'Leader', score: 0, is_leader: true },
  { id: 'player-id', name: 'Player', score: 0, is_leader: false }
];

describe('Sync Logic Transitions', () => {
  let mockChannel: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockedCreateClient.mockReturnValue({
      channel: () => mockChannel,
      removeChannel: jest.fn(),
    });

    // Default localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('leader-id'),
        setItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const renderRoom = async (code: string) => {
    const params = Promise.resolve({ code });
    let result: any;
    await act(async () => {
      result = render(
        <ThemeProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <RoomPage params={params} />
          </Suspense>
        </ThemeProvider>
      );
    });
    return result;
  };

  it('transitions from wager to question phase when all players have wagered', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'TEST',
        status: 'wager',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'leader-id'
      },
      players: mockPlayers,
      allAnswers: [
        { player_id: 'leader-id', question_id: 'q1', wager: 5 },
        { player_id: 'player-id', question_id: 'q1', wager: 3 }
      ]
    });

    await renderRoom('TEST');

    await waitFor(() => {
      expect(mockedActions.updateRoomStatus).toHaveBeenCalledWith('TEST', 'question');
    });
  });

  it('transitions from question to results phase when all players have answered', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'TEST',
        status: 'question',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'leader-id'
      },
      players: mockPlayers,
      allAnswers: [
        { player_id: 'leader-id', question_id: 'q1', wager: 5, submitted_answer: 'Paris', is_correct: true },
        { player_id: 'player-id', question_id: 'q1', wager: 3, submitted_answer: 'London', is_correct: false }
      ]
    });

    await renderRoom('TEST');

    await waitFor(() => {
      expect(mockedActions.updateRoomStatus).toHaveBeenCalledWith('TEST', 'results');
    });
  });

  it('automatically transitions from results to next round after 7 seconds (leader only)', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'TEST',
        status: 'results',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'leader-id'
      },
      players: mockPlayers,
      allAnswers: [
        { player_id: 'leader-id', question_id: 'q1', wager: 5, submitted_answer: 'Paris', is_correct: true },
        { player_id: 'player-id', question_id: 'q1', wager: 3, submitted_answer: 'London', is_correct: false }
      ]
    });

    await renderRoom('TEST');

    // Wait for initial render and results to show
    await waitFor(() => {
      expect(screen.getByText(/CORRECT/i)).toBeInTheDocument();
    });

    // Fast-forward 7 seconds
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    await waitFor(() => {
      // Since it's the only question, it should go to 'final'
      expect(mockedActions.updateRoomStatus).toHaveBeenCalledWith('TEST', 'final', 1);
    });
  });

  it('hides question text during wager phase', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'TEST',
        status: 'wager',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'leader-id'
      },
      players: mockPlayers,
      allAnswers: []
    });

    await renderRoom('TEST');

    await waitFor(() => {
      expect(screen.getByText('Question 1 Summary')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('What is the capital of France?')).not.toBeInTheDocument();
  });

  it('shows waiting screen after wagering but before phase transition', async () => {
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        code: 'TEST',
        status: 'wager',
        current_question_index: 0,
        questions: mockQuestions,
        leader_id: 'leader-id'
      },
      players: mockPlayers,
      allAnswers: [
        { player_id: 'leader-id', question_id: 'q1', wager: 5 }
      ]
    });

    await renderRoom('TEST');

    await waitFor(() => {
      expect(screen.getByText(/Waiting for concurrent node validation/i)).toBeInTheDocument();
    });
  });
});
