import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
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
    expect(screen.getByText(/Create Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Join Room/i)).toBeInTheDocument();
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
