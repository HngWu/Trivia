import { normalizeCode } from "./game-store";

// Per-room FIFO promise queue for in-process serialization of room state transitions
const roomQueues = new Map<string, Promise<unknown>>();

export async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const normalized = normalizeCode(code);
  const previous = roomQueues.get(normalized) || Promise.resolve();

  let resolveNext: () => void;
  const next = new Promise<void>(resolve => {
    resolveNext = resolve;
  });

  // Chain the new task to the queue
  roomQueues.set(
    normalized,
    previous.catch(() => {}).then(() => next)
  );

  try {
    await previous.catch(() => {});
    return await fn();
  } finally {
    resolveNext!();
    // Clean up map entry if queue has drained
    if (roomQueues.get(normalized) === next) {
      roomQueues.delete(normalized);
    }
  }
}
