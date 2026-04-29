import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RoomPage from '../src/app/room/[code]/page'
import { ThemeProvider } from '../src/components/ThemeProvider'

describe('Room Page', () => {
  it('renders waiting lobby', async () => {
    const params = { code: 'ABCD' };
    render(
      <ThemeProvider>
        <RoomPage params={params} />
      </ThemeProvider>
    );
    // Check for the room code ABCD
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    // Check for the "Room" label
    expect(screen.getByText(/Room/i)).toBeInTheDocument();
  });
});
