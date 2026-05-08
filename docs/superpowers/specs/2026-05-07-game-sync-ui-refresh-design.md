# Game Sync & UI Refresh Specification

This specification outlines the plan to fix game state synchronization desyncs and implement a modern, refined UI for the TriviaDuel application.

## 1. Synchronization: Scheduled State Transitions

To ensure all players transition between game phases (Wager -> Question -> Results -> Next Wager) at the exact same moment, we will implement "Scheduled Transitions" using a server-authoritative timestamp.

### 1.1 Server-Side Changes (`src/lib/actions.ts`)
- When the final player submits a wager or an answer, the server will calculate a "Scheduled Transition Time" (`targetTime`).
- `targetTime` = `Date.now() + 500` (0.5 seconds in the future).
- The `status_updated_at` field in the Redis room object will be updated to this future timestamp.
- The `status` will be updated to the next phase (e.g., `results`).

### 1.2 Client-Side Changes (`src/app/room/[code]/page.tsx`)
- We will add a new piece of state: `displayStatus`. This will lag behind the actual `roomStatus` if the `status_updated_at` is in the future.
- **Sync Logic:**
  - When `applyState` is called:
    - If `room.status_updated_at` is <= `Date.now()`, update `displayStatus` immediately.
    - If `room.status_updated_at` is in the future, set a `setTimeout` to update `displayStatus` at the exact target time.
- The UI will render based on `displayStatus` instead of `roomStatus`.

## 2. UI Refresh: Circular Timer & Refined Typography

### 2.1 Circular Timer Component
- Location: Fixed bottom-right.
- Visual: An SVG circle with `stroke-dashoffset` animation.
- Properties:
  - Outer glow: `shadow-[0_0_20px_rgba(255,255,255,0.1)]`.
  - Color: White (Standard), Red (Below 10s).
  - Center: A small pulsing white dot instead of text.
  - Text: No seconds or "Sec" label.

### 2.2 Refined Feedback
- "PASSED" -> "CORRECT".
- "FAILED" -> "WRONG".
- Results text size reduction: Change `text-[10rem]` to `text-6xl sm:text-8xl`.
- Global font adjustments: Scaling down headers and tracking for a tighter, more professional look.

## 3. Mobile Optimization: Tightened Layout

### 3.1 Responsiveness (`tailwind` classes)
- **Navigation:** Reduce `py-4` to `py-3` on mobile.
- **Main Padding:** Reduce `p-4 sm:p-12` to `p-3 sm:p-12`.
- **Question Section:**
  - Reduce margins between round indicator and question text.
  - Decrease gaps in the options grid (`gap-3` vs `gap-6`).
- **Results Card:**
  - Tighten padding in the mobile results card list.
  - Reduce vertical margins between sections (Wager Locked, Answer Sent, etc.).

## 4. Verification Plan

### 4.1 Manual Verification
- Open 3 browser windows on localhost.
- Submit final wager/answer in one window.
- Verify that all windows transition to the next phase at the exact same visual moment (after the 0.5s buffer).
- Test mobile view via Chrome DevTools (375px width) to verify tightened spacing.

### 4.2 Automated Testing
- Update `tests/room.test.tsx` (if applicable) to account for the delayed `displayStatus` logic.
- Ensure the circular timer renders correctly and handles the color transition at 10s.
