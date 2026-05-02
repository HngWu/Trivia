import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import React, { Suspense } from 'react';

// Mock redis and gemini BEFORE importing components
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

// Mock actions as well since we don't want to run real server actions
jest.mock('../src/lib/actions', () => ({
  getRoomState: jest.fn().mockResolvedValue({
    room: { code: 'ABCD', status: 'waiting', questions: [] },
    players: [],
    allAnswers: []
  }),
  updateRoomStatus: jest.fn(),
  submitWager: jest.fn(),
  submitAnswer: jest.fn(),
}));

import RoomPage from '../src/app/room/[code]/page'
import { ThemeProvider } from '../src/components/ThemeProvider'

describe('Room Page', () => {
  it('renders waiting lobby', async () => {
    const params = Promise.resolve({ code: 'ABCD' });
    
    await act(async () => {
      render(
        <ThemeProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <RoomPage params={params} />
          </Suspense>
        </ThemeProvider>
      );
    });

    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByText(/Lobby/i)).toBeInTheDocument();
  });
});
