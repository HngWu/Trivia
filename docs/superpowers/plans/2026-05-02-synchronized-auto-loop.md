# Synchronized Auto-Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a synchronized, fully automatic game loop where all players progress through phases together.

**Architecture:** Use the leader's client to monitor collective completion of wagers and answers, triggering room status updates. Add an automatic timer for transitioning from the results phase to the next round.

**Tech Stack:** React, Next.js, Redis, Supabase Broadcast.

---

### Task 1: Collective Transitions in `RoomPage.tsx`

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Update `checkCollectiveTransitions` logic**

```typescript
// Inside checkCollectiveTransitions effect:
if (roomStatus === "wager") {
  const wagersCount = roundData.competitors.length;
  if (wagersCount > 0 && wagersCount === players.length) {
    await updateRoomStatus(roomCode, "question");
    triggerSync();
  }
} else if (roomStatus === "question") {
  const answersCount = roundData.competitors.filter(a => a.submitted_answer !== "").length;
  if (answersCount > 0 && answersCount === players.length) {
    await updateRoomStatus(roomCode, "results");
    triggerSync();
  }
}
```

- [ ] **Step 2: Add automatic timer for `results` phase**

```typescript
// New effect:
useEffect(() => {
  if (roomStatus === "results" && isLeader) {
    const timer = setTimeout(() => {
      handleNextRound();
    }, 7000);
    return () => clearTimeout(timer);
  }
}, [roomStatus, isLeader, handleNextRound]);
```

- [ ] **Step 3: Update `handleNextRound` to reset question index correctly if needed**
(Verify current implementation)

- [ ] **Step 4: Commit transitions**

```bash
git add src/app/room/\[code\]/page.tsx
git commit -m "feat: implement collective transitions and auto-next timer"
```

---

### Task 2: UI Synchronization Feedback

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Hide question during `wager` phase**
Ensure the question text is only visible when `roomStatus === "question"`.

- [ ] **Step 2: Add "Waiting for others" screens**
Show a clear message when a player is done with their part but the room hasn't transitioned.

- [ ] **Step 3: Commit UI changes**

```bash
git add src/app/room/\[code\]/page.tsx
git commit -m "feat: update UI for synchronized phase feedback"
```

---

### Task 4: Verification

**Files:**
- Create: `tests/sync_logic.test.tsx`

- [ ] **Step 1: Write tests for transition logic**
Mock `updateRoomStatus` and `triggerSync`. Verify they are called when counts match.

- [ ] **Step 2: Run tests**

Run: `npx jest tests/sync_logic.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit tests**

```bash
git add tests/sync_logic.test.tsx
git commit -m "test: add synchronized loop logic tests"
```
