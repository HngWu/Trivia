import { render, screen } from '@testing-library/react'
import RoomPage from '../src/app/room/[code]/page'

describe('Room Page', () => {
  it('renders waiting lobby', async () => {
    // Next.js App Router params are usually handled by the framework, 
    // for unit tests we can just pass them.
    const params = { code: 'ABCD' };
    render(<RoomPage params={params} />);
    expect(screen.getByText('Room: ABCD')).toBeInTheDocument();
  });
});
