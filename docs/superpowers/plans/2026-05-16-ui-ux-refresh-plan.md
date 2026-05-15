# UI/UX Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI/UX refinements for the TriviaDuel application, focusing on immersive loading/joining states, vertical centering for wagering, improved mobile leaderboard navigation, and enhanced answer page readability.

**Architecture:** We will maintain the current component structure, modifying layout classes and wrapper components to enforce atmospheric consistency and improved responsive behavior.

**Tech Stack:** React, Tailwind CSS 4, CSS (Globals).

---

### Task 1: Update Room Loading States and Join Modal
**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Ensure Loading State displays background**
  Modify the `isLoading` return block to remove opaque backgrounds and ensure content is centered while maintaining the page's layout structure if possible, or ensuring the container does not override the global `DynamicBackground`.

- [ ] **Step 2: Refine Join Modal Atmosphere**
  Modify the `isJoining` modal to use more subtle glassmorphism and ensure it allows the underlying `DynamicBackground` to be visible through the overlay.

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/room/[code]/page.tsx
  git commit -m "feat: improve atmospheric consistency for loading and join screens"
  ```

### Task 2: Center Wager Grid
**Files:**
- Modify: `src/components/room/WagerView.tsx`

- [ ] **Step 1: Apply flex centering**
  Modify the main container class in `WagerView` to include `flex flex-col justify-center items-center min-h-[60vh]`.

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/room/WagerView.tsx
  git commit -m "feat: vertically center wager grid"
  ```

### Task 3: Fix Leaderboard Mobile Navigation
**Files:**
- Modify: `src/components/room/RoomNav.tsx`

- [ ] **Step 1: Update Leaderboard container**
  Update the leaderboard flex container to use `flex-nowrap` to prevent wrapping and ensure `overflow-x-auto` behaves correctly for touch navigation.

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/room/RoomNav.tsx
  git commit -m "fix: improve mobile leaderboard scrolling"
  ```

### Task 4: Refine Answer Page Readability
**Files:**
- Modify: `src/components/room/QuestionView.tsx`

- [ ] **Step 1: Adjust Padding and Typography**
  Modify `QuestionView` to use tighter mobile padding (`p-4 sm:p-12`) and responsive text scaling for the question text (`text-lg sm:text-2xl`) and buttons.

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/room/QuestionView.tsx
  git commit -m "feat: refine mobile answer page readability"
  ```
