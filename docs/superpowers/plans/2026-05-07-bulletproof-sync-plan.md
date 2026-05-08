# Bulletproof Sync & Global Game Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve millisecond-perfect synchronization across all clients by implementing a server-synchronized "Global Game Time" and a versioned state machine.

**Architecture:**
- **Server:** Authors every state with an incrementing `version` and a future `status_updated_at` (1.5s buffer).
- **Client:** Syncs its local clock with the server on load. Only accepts newer state versions. Uses the synchronized clock to trigger transitions at the exact same millisecond.

**Tech Stack:** Next.js 16, TypeScript, Redis.

---

### Task 1: Server-Side Versioning & Buffer Update

**Files:**
- Modify: `src/lib/types/game.ts`
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Add `version` to `Room` type**

```typescript
// src/lib/types/game.ts
export type Room = {
  // ... existing fields ...
  status_updated_at?: number;
  version: number; // New field
};
```

- [ ] **Step 2: Increase Buffer and Implement Versioning in `actions.ts`**

Update `SYNC_BUFFER_MS` to 1500 and create a helper to update room state with version increment.

```typescript
// src/lib/actions.ts
const SYNC_BUFFER_MS = 1500; // Increased from 500

// Add this server action
export async function getServerTime() {
  return Date.now();
}

// In every action that updates room state (updateRoomStatus, submitWager, submitAnswer):
// Ensure room.version is incremented and room.status_updated_at uses the new SYNC_BUFFER_MS.
```

- [ ] **Step 3: Commit server changes**

Run: `git add src/lib/types/game.ts src/lib/actions.ts && git commit -m "feat: implement room versioning and increase sync buffer to 1.5s"`

---

### Task 2: Client-Side Clock Synchronization

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add `serverOffset` state and handshake logic**

```typescript
// src/app/room/[code]/page.tsx
  const [serverOffset, setServerOffset] = useState(0);

  useEffect(() => {
    const syncClock = async () => {
      const t0 = performance.now();
      const serverNow = await getServerTime();
      const t1 = performance.now();
      const latency = (t1 - t0) / 2;
      const offset = serverNow - (Date.now() - latency);
      setServerOffset(offset);
    };
    syncClock();
  }, []);
```

- [ ] **Step 2: Update `applyState` with version guard**

```typescript
// src/app/room/[code]/page.tsx
  const currentVersionRef = useRef(-1);

  const applyState = useCallback((state: any) => {
    const { room, players: p, allAnswers: a } = state;
    if (!room) return;
    
    // VERSION GUARD
    if (room.version <= currentVersionRef.current) return;
    currentVersionRef.current = room.version;

    // ... rest of applyState ...
    // Ensure syncLoop uses (Date.now() + serverOffset)
  }, [serverOffset, ...]);
```

- [ ] **Step 3: Commit clock sync**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "feat: implement NTP-lite clock synchronization and version guard"`

---

### Task 3: Logical Input Lock & UI Polish

**Files:**
- Modify: `src/app/room/[code]/page.tsx`
- Modify: `src/app/room/[code]/FluidTimer.tsx`

- [ ] **Step 1: Implement global `isLocked` state**

```typescript
// src/app/room/[code]/page.tsx
const isLocked = useMemo(() => roomStatus !== displayStatus, [roomStatus, displayStatus]);

// Pass isLocked to all buttons and inputs
```

- [ ] **Step 2: Update `FluidTimer` to use server offset**

```typescript
// src/app/room/[code]/FluidTimer.tsx
// Add serverOffset to props
const elapsed = (Date.now() + serverOffset) - statusUpdatedAt;
```

- [ ] **Step 3: Commit UI refinements**

Run: `git add src/app/room/[code]/page.tsx src/app/room/[code]/FluidTimer.tsx && git commit -m "ui: implement strict input locking during sync and update timer precision"`

---

### Task 4: Verification

- [ ] **Step 1: Verify on multiple devices (if possible) or browser tabs**
- [ ] **Step 2: Ensure "Finalizing..." covers the 1.5s gap and feels smooth**
- [ ] **Step 3: Run existing tests**
Run: `npx jest`
