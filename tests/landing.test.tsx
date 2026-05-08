import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react';

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

// Mock actions
jest.mock('../src/lib/actions', () => ({
  createRoom: jest.fn(),
  joinRoom: jest.fn(),
  getTopics: jest.fn().mockResolvedValue([
    { id: 'history', name: 'History', icon: '📜', description: 'Past events', example_question: 'Who was the first president?' }
  ]),
}));

import Home from '../src/app/page'

describe('Landing Page', () => {
  it('renders landing page with main actions', async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByRole('button', { name: /Join a Battle/i })).toBeInTheDocument();
    expect(screen.getByText(/Select Category/i)).toBeInTheDocument();
  });

  it('displays topic selection and reveals create flow on click', async () => {
    await act(async () => {
      render(<Home />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('History')).toBeInTheDocument();
    });
    
    // Click History category
    await act(async () => {
      fireEvent.click(screen.getByText('History'));
    });
    
    // Now nickname and create button should appear
    expect(screen.getByPlaceholderText(/Enter Nickname/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Battle/i })).toBeInTheDocument();
  });
});
