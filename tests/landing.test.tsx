import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '../src/app/page'

describe('Landing Page', () => {
  it('renders landing page with main actions', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/Enter nickname/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Join Room/i)).toBeInTheDocument();
  });

  it('displays topic selection', () => {
    render(<Home />);
    expect(screen.getByText(/Choose a Topic/i)).toBeInTheDocument();
    expect(screen.getByText(/History/i)).toBeInTheDocument();
    expect(screen.getByText(/Science/i)).toBeInTheDocument();
  });
});
