# Game Sync & UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize game state transitions across all clients using scheduled transitions (0.5s buffer) and refresh the UI with a modern circular timer and tightened mobile layout.

**Architecture:** 
- **Server:** Updates `status_updated_at` to `Date.now() + 500` when a phase completes.
- **Client:** Uses a `displayStatus` state that synchronized with `roomStatus` only at or after `status_updated_at`.
- **UI:** Replaces text timer with an SVG circular progress ring and refines typography/spacing.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, Upstash Redis.

---

### Task 1: Server-Side Scheduled Transitions

**Files:**
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Update `updateRoomStatus` to use future timestamp**

```typescript
// src/lib/actions.ts
export async function updateRoomStatus(code: string, status: string, index?: number) {
  const normalizedCode = code.toUpperCase();
  const room = await redis.get<Room>(`room:${normalizedCode}`);
  if (!room) throw new Error("Room not found");
  
  room.status = status;
  room.status_updated_at = Date.now() + 500; // 0.5s buffer for sync
  if (index !== undefined) room.current_question_index = index;
  
  await redis.set(`room:${normalizedCode}`, room, { ex: ROOM_TTL });
  return await getFullState(normalizedCode);
}
```

- [ ] **Step 2: Update `submitWager` transition logic**

```typescript
// src/lib/actions.ts
// ... in submitWager ...
    if (qAnswers.length > 0 && qAnswers.length === state.players.length) {
       state.room.status = "question";
       state.room.status_updated_at = Date.now() + 500; // 0.5s buffer
       await redis.set(`room:${normalizedCode}`, state.room, { ex: ROOM_TTL });
       return await getFullState(normalizedCode);
    }
```

- [ ] **Step 3: Update `submitAnswer` transition logic**

```typescript
// src/lib/actions.ts
// ... in submitAnswer ...
    if (state.room && state.room.status === "question") {
      const qAnswers = state.allAnswers.filter(a => a.question_id === questionId && a.submitted_answer !== "");
      if (qAnswers.length > 0 && qAnswers.length === state.players.length) {
         state.room.status = "results";
         state.room.status_updated_at = Date.now() + 500; // 0.5s buffer
         await redis.set(`room:${normalizedCode}`, state.room, { ex: ROOM_TTL });
         return await getFullState(normalizedCode);
      }
    }
```

- [ ] **Step 4: Commit server changes**

Run: `git add src/lib/actions.ts && git commit -m "feat: implement 0.5s buffer for server-side state transitions"`

---

### Task 2: Client-Side Scheduled State

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add `displayStatus` and `scheduledUpdateRef`**

```typescript
// src/app/room/[code]/page.tsx
  // ... near existing state ...
  const [roomStatus, setRoomStatus] = useState<GameState>("waiting");
  const [displayStatus, setDisplayStatus] = useState<GameState>("waiting");
  const scheduledUpdateRef = useRef<NodeJS.Timeout | null>(null);
```

- [ ] **Step 2: Update `applyState` to handle scheduling**

```typescript
// src/app/room/[code]/page.tsx
  const applyState = useCallback((state: any) => {
    const { room, players: p, allAnswers: a } = state;
    if (!room) return;

    lastSyncTimeRef.current = Date.now();
    // ... existing player check logic ...

    setRoomLeaderId(room.leader_id);
    setTopic(room.topic || "");
    if (p) setPlayers(p);
    if (room.questions) setQuestions(room.questions);

    // ... existing mergedAnswers logic ...

    if (room.current_question_index !== currentIndexRef.current) {
      setTextAnswer("");
      currentIndexRef.current = room.current_question_index;
      pendingSubmissionsRef.current = {};
    }
    
    setRoomStatus(room.status as GameState);
    setCurrentIndex(room.current_question_index);
    setStatusUpdatedAt(room.status_updated_at || Date.now());

    // SCHEDULED TRANSITION LOGIC
    if (scheduledUpdateRef.current) clearTimeout(scheduledUpdateRef.current);

    const now = Date.now();
    const target = room.status_updated_at || now;
    const delay = Math.max(0, target - now);

    if (delay === 0) {
      setDisplayStatus(room.status as GameState);
    } else {
      scheduledUpdateRef.current = setTimeout(() => {
        setDisplayStatus(room.status as GameState);
      }, delay);
    }
  }, [myPlayerId, isJoining]);
```

- [ ] **Step 3: Update all UI conditional rendering to use `displayStatus` instead of `roomStatus`**

Update occurrences of `roomStatus === "waiting"`, `roomStatus === "wager"`, etc., in the JSX to use `displayStatus`.

- [ ] **Step 4: Commit client sync changes**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "feat: implement displayStatus with scheduled transitions on client"`

---

### Task 3: Circular Timer Component

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Replace Timer Overlay with Circular SVG**

Find the timer overlay block and replace it:

```tsx
// src/app/room/[code]/page.tsx
        {/* Global Timer Overlay */}
        {displayStatus !== "waiting" && displayStatus !== "final" && (
          <div className="fixed bottom-12 right-12 z-40 flex items-center justify-center animate-fade-in">
             <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.05)"
                    stroke-width="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={timer < 10 ? "#ef4444" : "white"}
                    stroke-width="8"
                    fill="transparent"
                    stroke-dasharray="251.2"
                    stroke-dashoffset={251.2 - (251.2 * timer) / 60}
                    stroke-linecap="round"
                    className="transition-all duration-1000 linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className={`w-2 h-2 rounded-full transition-all duration-500 ${timer < 10 ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-150" : "bg-white/40"}`} />
                </div>
             </div>
          </div>
        )}
```

- [ ] **Step 2: Commit timer changes**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "ui: replace numeric timer with circular SVG progress ring"`

---

### Task 4: UI Refinements (Typography & Feedback)

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Update "PASSED/FAILED" to "CORRECT/WRONG" and adjust sizing**

```tsx
// src/app/room/[code]/page.tsx
              <h2 className={`text-5xl sm:text-8xl font-black italic tracking-tighter leading-none transition-all drop-shadow-[0_0_80px_rgba(255,255,255,0.1)] ${roundData.results.correct ? "text-white scale-105" : "text-gray-800"}`}>
                {roundData.results.correct ? "CORRECT" : "WRONG"}
              </h2>
```

- [ ] **Step 2: Adjust overall spacing in results and lobby**

- Reduce `py-8 sm:py-12` to `py-4 sm:py-12` in the Results view.
- Reduce margin in header: `mb-8 sm:mb-16` to `mb-6 sm:mb-12`.

- [ ] **Step 3: Commit UI refinements**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "ui: refine feedback text and typography sizing"`

---

### Task 5: Mobile Layout Tightening

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Tighten Navigation and Main Container**

```tsx
// src/app/room/[code]/page.tsx
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 ...">

      {/* Main Content Area */}
      <main ... className="flex-1 flex flex-col items-center p-3 sm:p-12 ...">
```

- [ ] **Step 2: Tighten Options Grid and Results Cards**

- In `question` phase: `grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6` (was `gap-6`).
- In `results` phase (mobile card): `p-4 rounded-xl gap-3` (was `p-5 rounded-2xl gap-4`).
- Reduce spacing between "Answer" and "Wager" sections in mobile card.

- [ ] **Step 3: Commit mobile tightening**

Run: `git add src/app/room/[code]/page.tsx && git commit -m "ui: tighten mobile layout padding and margins"`

---

### Task 6: Final Verification

- [ ] **Step 1: Verify on Localhost with multiple sessions**
- [ ] **Step 2: Verify Mobile responsiveness in DevTools**
- [ ] **Step 3: Run existing tests**
Run: `npm test`
