# Bulletproof Synchronization & Global Game Time Specification

This specification redesigns the game state engine to achieve perfect, simultaneous transitions across all clients regardless of network latency or local clock skew.

## 1. Global Game Time (NTP-lite)

The primary cause of desync is that `Date.now()` varies between devices. We will implement a synchronized clock.

### 1.1 Synchronization Handshake
- **Server:** A new `getServerTime` action returns `Date.now()`.
- **Client:** On mount, the client performs a 3-step handshake:
  1. Record `t0 = performance.now()`.
  2. Call `getServerTime()`.
  3. Record `t1 = performance.now()` and receive `serverNow`.
  4. Calculate `latency = (t1 - t0) / 2`.
  5. Calculate `serverOffset = serverNow - (Date.now() - latency)`.
- **Global Hook:** `useGameTime()` will return `Date.now() + serverOffset`.

## 2. Versioned State Machine

To prevent "out-of-order" state updates (where a late broadcast from an old state overwrites a newer state), we will version every room update.

### 2.1 Schema Update
- Add `version: number` to the `Room` type.
- Increment `version` in Redis whenever `status` or `current_question_index` changes.

### 2.2 Client-Side Guard
- Maintain `currentVersionRef`.
- In `applyState`, if `incoming.version <= currentVersionRef.current`, discard the update.

## 3. Simultaneous Phase "Flip"

We will increase the buffer and use a stricter locking mechanism.

### 3.1 Extended Buffer
- Increase `SYNC_BUFFER_MS` from 500ms to 1500ms. 
- This ensures even players with 1s of latency receive the "prepare" broadcast before the flip occurs.

### 3.2 High-Precision Flip Loop
- The `requestAnimationFrame` loop in `RoomPage` will now use the synchronized `GameTime`.
- `const now = Date.now() + serverOffset;`
- `if (now >= room.status_updated_at) flipDisplay();`

## 4. UI/UX Refinement

### 4.1 Strict Input Lock
- During the period where `roomStatus !== displayStatus` (the "Finalizing" buffer), all buttons and inputs will be `disabled`.
- A "Synchronizing..." overlay will prevent any accidental late submissions.

## 5. Implementation Steps

1.  **Types:** Add `version` to `Room` type.
2.  **Server:** Update `actions.ts` to increment version and increase buffer. Add `getServerTime`.
3.  **Clock Hook:** Create `useClockSync` to manage the `serverOffset`.
4.  **Client Logic:** Update `applyState` to check versions and use the synchronized clock for the `syncLoop`.
5.  **Timer:** Update `FluidTimer` to use the synchronized clock for its offset calculation.
