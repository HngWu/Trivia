import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { Suspense } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

// Mock redis
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

import RoomPage from '../src/app/room/[code]/page';
import * as actions from '../src/lib/actions';
import { createClient } from '../src/lib/supabase/client';

jest.mock('../src/lib/actions');
jest.mock('../src/lib/supabase/client');

const mockedActions = actions as jest.Mocked<typeof actions>;
const mockedCreateClient = createClient as jest.Mock;

describe('Room Realtime & Redis Fallback in Client', () => {
  let mockChannel: any;
  let channelSubscribeCallback: ((status: string, err?: any) => void) | null = null;

  beforeEach(() => {
    channelSubscribeCallback = null;
    mockChannel = {
      state: 'joined',
      channelAdapter: {
        canPush: jest.fn().mockReturnValue(true),
      },
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((cb) => {
        channelSubscribeCallback = cb;
        if (cb) cb('SUBSCRIBED');
        return mockChannel;
      }),
      send: jest.fn().mockResolvedValue('ok'),
      httpSend: jest.fn().mockResolvedValue({ success: true }),
    };

    mockedCreateClient.mockReturnValue({
      channel: () => mockChannel as unknown as RealtimeChannel,
      removeChannel: jest.fn(),
    });

    mockedActions.getServerTime.mockResolvedValue(Date.now());
    mockedActions.getRoomState.mockResolvedValue({
      room: {
        version: 1,
        code: 'ABCD',
        status: 'waiting',
        questions: [],
        leader_id: 'p1',
        topic: 'General',
        status_updated_at: Date.now(),
        current_question_index: 0,
      },
      players: [{ id: 'p1', name: 'Test Player', score: 0, is_leader: true }],
      allAnswers: [],
    });
    mockedActions.joinRoom.mockResolvedValue({
      room: {
        version: 1,
        code: 'ABCD',
        status: 'waiting',
        questions: [],
        leader_id: 'p1',
        topic: 'General',
        status_updated_at: Date.now(),
        current_question_index: 0,
      },
      player: { id: 'p1', name: 'Test Player', score: 0, is_leader: true },
    });
    mockedActions.getRoomSync.mockResolvedValue({
      version: 1,
      statusUpdatedAt: Date.now(),
      status: 'waiting',
      currentQuestionIndex: 0,
    });
    mockedActions.touchRoomSync.mockResolvedValue(1);

    localStorage.setItem('player_name', 'Test Player');
    localStorage.removeItem('player_id');
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('uses channel.send when canPush is true without calling httpSend', async () => {
    mockChannel.channelAdapter.canPush.mockReturnValue(true);

    const params = Promise.resolve({ code: 'ABCD' });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <RoomPage params={params} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('ABCD')[0]).toBeInTheDocument();
    });

    // Auto-join triggers triggerSync()
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'STATE_UPDATED',
      })
    );
    expect(mockChannel.httpSend).not.toHaveBeenCalled();
  });

  it('explicitly uses channel.httpSend when canPush is false, preventing deprecation warning', async () => {
    mockChannel.channelAdapter.canPush.mockReturnValue(false);
    mockChannel.state = 'joining';

    const params = Promise.resolve({ code: 'ABCD' });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <RoomPage params={params} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('ABCD')[0]).toBeInTheDocument();
    });

    // When canPush is false, send() must NOT be called
    expect(mockChannel.send).not.toHaveBeenCalled();
    // httpSend() must be called explicitly
    expect(mockChannel.httpSend).toHaveBeenCalledWith(
      'STATE_UPDATED',
      expect.objectContaining({ t: expect.any(Number) })
    );
  });

  it('falls back to touchRoomSync when both WebSocket and httpSend fail', async () => {
    mockChannel.channelAdapter.canPush.mockReturnValue(false);
    mockChannel.httpSend.mockRejectedValueOnce(new Error('Network error'));

    const params = Promise.resolve({ code: 'ABCD' });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <RoomPage params={params} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('ABCD')[0]).toBeInTheDocument();
    });

    expect(mockedActions.touchRoomSync).toHaveBeenCalledWith('ABCD');
  });

  it('polls Redis and updates state when Realtime is degraded and a newer version appears', async () => {
    // Simulate disconnected channel
    mockChannel.subscribe.mockImplementation((cb: (status: string, err?: any) => void) => {
      if (cb) cb('CHANNEL_ERROR', new Error('Connection failed'));
      return mockChannel;
    });

    // Initial state version 1
    const params = Promise.resolve({ code: 'ABCD' });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <RoomPage params={params} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('ABCD')[0]).toBeInTheDocument();
    });

    // Simulate Redis reporting a newer version 2
    mockedActions.getRoomSync.mockResolvedValueOnce({
      version: 2,
      statusUpdatedAt: Date.now(),
      status: 'wager',
      currentQuestionIndex: 0,
    });
    mockedActions.getRoomState.mockResolvedValueOnce({
      room: {
        version: 2,
        code: 'ABCD',
        status: 'wager',
        questions: [],
        leader_id: 'p1',
        topic: 'General',
        status_updated_at: Date.now(),
        current_question_index: 0,
      },
      players: [{ id: 'p1', name: 'Test Player', score: 0, is_leader: true }],
      allAnswers: [],
    });

    // Wait for the Redis fallback poll to detect version 2 and call getRoomState
    await waitFor(
      () => {
        expect(mockedActions.getRoomSync).toHaveBeenCalledWith('ABCD');
      },
      { timeout: 2500 }
    );
  });
});
