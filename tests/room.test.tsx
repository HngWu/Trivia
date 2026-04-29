import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RoomPage from '../src/app/room/[code]/page'
import { ThemeProvider } from '../src/components/ThemeProvider'

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    use: () => ({ code: 'ABCD' })
  };
});

describe('Room Page', () => {
  it('renders waiting lobby', async () => {
    // The params promise isn't actually used because of our mock,
    // but we satisfy the typescript signature.
    const params = Promise.resolve({ code: 'ABCD' });
    render(
      <ThemeProvider>
        <RoomPage params={params} />
      </ThemeProvider>
    );
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByText(/Room/i)).toBeInTheDocument();
  });
});
