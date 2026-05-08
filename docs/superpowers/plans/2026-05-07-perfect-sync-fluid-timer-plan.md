# Perfect Sync & Fluid Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement high-precision synchronization for room state transitions and a perfectly smooth 60fps circular timer animation.

**Architecture:**
- **High-Precision Sync:** Uses `requestAnimationFrame` (rAF) to check the current time against the scheduled transition timestamp on every frame.
- **Fluid Timer:** Replaces the discrete integer `timer` state with a continuous offset calculation inside the rAF loop, ensuring the circular ring glides smoothly.
- **Client-Side Authoritative Timing:** Uses `Date.now()` compared against the server's `status_updated_at` for frame-perfect transitions.

**Tech Stack:** Next.js 16, TypeScript, React Hooks, `requestAnimationFrame`.

---

### Task 1: High-Precision Sync Loop

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add `rAF` reference and cleanup**

```typescript
// src/app/room/[code]/page.tsx
  // ... existing refs ...
  const scheduledUpdateRef = useRef<number | null>(null); // Change to number for rAF ID

  // Add cleanup to existing useEffect or new one
  useEffect(() => {
    return () => {
      if (scheduledUpdateRef.current) cancelAnimationFrame(scheduledUpdateRef.current);
    };
  }, []);
```

- [ ] **Step 2: Implement rAF-based `applyState` synchronization**

Replace the `setTimeout` logic in `applyState` with a rAF loop:

```typescript
// src/app/room/[code]/page.tsx
    // Task 2: Client-Side Scheduled State (High Precision)
    if (scheduledUpdateRef.current) {
      cancelAnimationFrame(scheduledUpdateRef.current);
    }

    const targetTime = room.status_updated_at || Date.now();
    
    const checkSync = () => {
      if (Date.now() >= targetTime) {
        setDisplayStatus(room.status as GameState);
        scheduledUpdateRef.current = null;
      } else {
        scheduledUpdateRef.current = requestAnimationFrame(checkSync);
      }
    };

    if (Date.now() >= targetTime) {
      setDisplayStatus(room.status as GameState);
    } else {
      scheduledUpdateRef.current = requestAnimationFrame(checkSync);
    }
```

- [ ] **Step 3: Commit high-precision sync logic**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "feat: implement high-precision synchronization using requestAnimationFrame"`

---

### Task 2: Fluid Circular Timer

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add `visualOffset` state for the smooth ring**

```typescript
// src/app/room/[code]/page.tsx
  const [visualOffset, setVisualOffset] = useState(0);
```

- [ ] **Step 2: Update the continuous timer effect**

Replace the 1s `setInterval` timer effect with a `requestAnimationFrame` loop that calculates the precise offset:

```typescript
// src/app/room/[code]/page.tsx
  // 3. High-Precision Visual Timer Logic (60 FPS)
  useEffect(() => {
    if (displayStatus === "waiting" || displayStatus === "final" || isLoading || !statusUpdatedAt) {
       setVisualOffset(0);
       return;
    }

    let rafId: number;
    const updateVisualTimer = () => {
      const elapsed = Date.now() - statusUpdatedAt;
      const totalMs = 60000;
      const remainingMs = Math.max(0, totalMs - elapsed);
      
      // Calculate smooth dash offset (251.2 is the circumference)
      const offset = 251.2 - (251.2 * remainingMs) / totalMs;
      setVisualOffset(offset);

      // We still update the discrete 'timer' state for logical events (Time Up)
      // but we do it less frequently or keep the existing interval for logic.
      
      rafId = requestAnimationFrame(updateVisualTimer);
    };

    rafId = requestAnimationFrame(updateVisualTimer);
    return () => cancelAnimationFrame(rafId);
  }, [displayStatus, isLoading, currentIndex, statusUpdatedAt]);
```

- [ ] **Step 3: Update SVG to use `visualOffset`**

```tsx
// src/app/room/[code]/page.tsx
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={timer < 10 ? "#ef4444" : "white"}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={visualOffset} // Use the smooth visualOffset
                  strokeLinecap="round"
                  className="transition-[stroke] duration-500" // Only transition color, not offset
                />
```

- [ ] **Step 4: Commit fluid timer**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "ui: implement fluid 60fps circular timer animation"`

---

### Task 3: Optimization & Final Polish

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Ensure `timer` state (integer) is still updated for logic**

Keep the existing `updateTimer` logic for the `timer` state (used for red color and `handleTimeUp`), but ensure it doesn't conflict with the visual offset.

- [ ] **Step 2: Add CSS smoothing**

Ensure the `transition: stroke-dashoffset` is REMOVED from the circle that uses `visualOffset` to prevent conflict between rAF and CSS transitions.

- [ ] **Step 3: Commit polish**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "perf: polish high-precision sync and fluid animation"`

---

### Task 4: Final Verification

- [ ] **Step 1: Verify 3-window sync**
- [ ] **Step 2: Verify timer smoothness (no ticking)**
- [ ] **Step 3: Run existing tests**
Run: `npx jest`
