import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WagerView from '@/components/room/WagerView';
import { Player } from '@/lib/types/game';

describe('WagerView Component', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'Alice', score: 0, is_leader: true },
    { id: 'p2', name: 'Bob', score: 0, is_leader: false }
  ];

  it('renders all 10 wager buttons with correct labels and shortcuts', () => {
    const handleSelectWager = jest.fn();
    const handleForceAdvance = jest.fn();

    const { container } = render(
      <WagerView
        roundData={{ wager: null, wagerCount: 0 }}
        players={mockPlayers}
        isLocked={false}
        usedWagers={[3]}
        onSelectWager={handleSelectWager}
        isLeader={true}
        onForceAdvance={handleForceAdvance}
      />
    );

    // Header should be present in flow
    expect(screen.getByText('Points at stake')).toBeInTheDocument();
    expect(screen.getByText('How many points?')).toBeInTheDocument();

    // Verify all 10 numbers are rendered
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }

    // Button 3 should be disabled (used wager)
    const button3 = screen.getByText('3').closest('button');
    expect(button3).toBeDisabled();

    // Button 5 should be enabled and clickable
    const button5 = screen.getByText('5').closest('button');
    expect(button5).toBeEnabled();
    fireEvent.click(button5!);
    expect(handleSelectWager).toHaveBeenCalledWith(5);

    // Verify negative translate (-translate-y-10) is NOT present
    expect(container.querySelector('.sm\\:-translate-y-10')).toBeNull();
  });

  it('handles keyboard shortcuts for wager selection', () => {
    const handleSelectWager = jest.fn();

    render(
      <WagerView
        roundData={{ wager: null, wagerCount: 0 }}
        players={mockPlayers}
        isLocked={false}
        usedWagers={[]}
        onSelectWager={handleSelectWager}
        isLeader={false}
        onForceAdvance={jest.fn()}
      />
    );

    // Press '7'
    fireEvent.keyDown(window, { key: '7' });
    expect(handleSelectWager).toHaveBeenCalledWith(7);

    // Press '0' (mapped to 10)
    fireEvent.keyDown(window, { key: '0' });
    expect(handleSelectWager).toHaveBeenCalledWith(10);
  });

  it('renders locked state cleanly without overlapping header', () => {
    const handleForceAdvance = jest.fn();

    const { container } = render(
      <WagerView
        roundData={{ wager: 8, wagerCount: 1 }}
        players={mockPlayers}
        isLocked={false}
        usedWagers={[8]}
        onSelectWager={jest.fn()}
        isLeader={true}
        onForceAdvance={handleForceAdvance}
      />
    );

    expect(screen.getByText(/Point stake locked \(8 pts\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Waiting for players \(1\/2\)/i)).toBeInTheDocument();

    // Leader should see Reveal Question button
    const revealBtn = screen.getByRole('button', { name: /Reveal Question/i });
    expect(revealBtn).toBeInTheDocument();
    fireEvent.click(revealBtn);
    expect(handleForceAdvance).toHaveBeenCalledWith('question');

    // No negative translate
    expect(container.querySelector('.sm\\:-translate-y-10')).toBeNull();
  });
});
