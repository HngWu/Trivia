# Perfect Sync & Fluid Timer Specification

This specification addresses the remaining desync issues and the "jerky" timer animation by moving to a high-precision, frame-rate independent system.

## 1. High-Precision Synchronization (The "Flip")

Current synchronization relies on `setTimeout`, which can be delayed by up to 10-50ms (or more in background tabs) due to the browser's event loop. 

### 1.1 Transition Watcher
We will implement a `useHighPrecisionSync` hook (or internal logic in `RoomPage`) that uses `requestAnimationFrame` (rAF). 
- **Mechanism:** Once a new `status_updated_at` (future timestamp) is received, a rAF loop begins.
- **Precision:** On every frame (~16ms), it compares `performance.now()` (converted to wall-clock time) or `Date.now()` against the target.
- **Execution:** The moment `Date.now() >= status_updated_at`, the `displayStatus` state is updated. This bypasses `setTimeout`'s lower priority.

## 2. Fluid Circular Timer (60 FPS)

The current timer updates once per second, creating a "ticking" motion. We will move to a continuous calculation.

### 2.1 Continuous Calculation
- The `stroke-dashoffset` will no longer be tied to a `timer` state that increments by 1.
- Instead, it will be calculated as:
  `offset = 251.2 - (251.2 * msRemaining) / 60000`
- This value will be calculated inside the rAF loop, providing a perfectly smooth, gliding animation.

## 3. Implementation Details

### 3.1 Server Buffer
- We will keep the `SYNC_BUFFER_MS = 500` in `src/lib/actions.ts` as it provides sufficient lead time for the broadcast to reach all clients.

### 3.2 Client Logic (`src/app/room/[code]/page.tsx`)
- **State Removal:** Remove the `timer` state (integer) for the visual ring. 
- **New State:** A `preciseTimer` (float) or direct rAF-driven ref for the SVG offset.
- **Smoothness:** Add `transition: stroke-dashoffset 0.1s linear` to the SVG circle to handle any tiny network jitter, while the rAF loop provides the primary movement.

## 4. Verification

- **Manual:** Open 3 windows. Observe the "Finalizing" state. All windows must flip to the Question/Results screen at the exact same visual frame.
- **Visual:** The circular timer must glide smoothly without any visible "jumps" every second.

Does this high-precision design meet your requirements for "perfect and fast" synchronization?