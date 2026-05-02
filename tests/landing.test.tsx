import { render, screen } from '@testing-library/react'
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
}));

import Home from '../src/app/page'
import { ThemeProvider } from '../src/components/ThemeProvider'

describe('Landing Page', () => {
  it('renders landing page with main actions', () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );
    expect(screen.getByPlaceholderText(/Enter nickname/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Battle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Battle/i })).toBeInTheDocument();
  });

  it('displays topic selection', () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );
    // There are multiple "Topic" related strings, check for some specific ones
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });
});
