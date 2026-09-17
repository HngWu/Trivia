import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsView from '@/components/room/ResultsView';

describe('ResultsView Next Round / Leaderboard Button', () => {
  const defaultProps = {
    currentQuestion: {
      id: 'q1',
      summary: 'Summary',
      text: 'Question text?',
      type: 'multiple_choice' as const,
      options: ['A', 'B'],
      correct_answer: 'A',
      topic: 'General'
    },
    roundData: {
      results: {
        correct: true,
        answer: 'A',
        explanation: 'Because A'
      },
      wager: 5,
      competitors: []
    },
    players: [{ id: 'p1', name: 'Leader', score: 10, is_leader: true }],
    myPlayerId: 'p1',
    isLeader: true,
    isLocked: false,
    onNextRound: jest.fn()
  };

  it('renders "Next Round" when it is not the last round', () => {
    render(<ResultsView {...defaultProps} isLastRound={false} />);

    expect(screen.getByRole('button', { name: /Next Round/i })).toBeInTheDocument();
    expect(screen.getByText(/Next round starting soon.../i)).toBeInTheDocument();
  });

  it('renders "Show Leaderboard" when it is the last round', () => {
    render(<ResultsView {...defaultProps} isLastRound={true} />);

    expect(screen.getByRole('button', { name: /Show Leaderboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Final standings incoming.../i)).toBeInTheDocument();
  });
});
