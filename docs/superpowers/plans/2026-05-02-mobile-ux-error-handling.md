# Mobile UX & Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize TriviaDuel for mobile devices with responsive typography, a multi-step onboarding flow, and a custom Toast notification system for errors.

**Architecture:** Component-based Toast system with localized state in pages (for simplicity) or a small context. Responsive refactor using Tailwind's breakpoint prefixes (`sm:`, `md:`, `lg:`).

**Tech Stack:** Next.js 16, Tailwind CSS 4, Framer Motion (or CSS animations).

---

### Task 1: Toast Notification System

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Create the Toast component**
Implement a reusable Toast banner with `bg-red-500/90` and fade-in animations.

- [ ] **Step 2: Integrate Toast state into pages**
Add `error` and `showToast` state logic to handle error messages.

- [ ] **Step 3: Commit**
```bash
git add src/components/Toast.tsx src/app/page.tsx src/app/room/[code]/page.tsx
git commit -m "feat: implement custom Toast notification system"
```

### Task 2: Landing Page Mobile Optimization

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement Header and Grid scaling**
Reduce font sizes and padding for the main title and category cards on mobile.

- [ ] **Step 2: Implement Multi-Step Mobile Flow**
On mobile screens, if a topic is selected, hide the grid and show only the detail view (Description, Name, Create button). Add a "Back" button.

- [ ] **Step 3: Replace `alert()` with Toast**
Ensure all error paths use the new toast system.

- [ ] **Step 4: Commit**
```bash
git add src/app/page.tsx
git commit -m "ui: optimize landing page for mobile with multi-step flow"
```

### Task 3: Room Page Mobile Optimization

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Responsive Typography**
Scale down massive headers (Lobby, Terminated, Results) using `sm:` breakpoints.

- [ ] **Step 2: Interactive Element Scaling**
- Shrink "Start Battle" and "Wager" buttons on mobile.
- Adjust "Round Summary" table for smaller viewports (e.g., allow horizontal scroll or condense columns).

- [ ] **Step 3: Replace `alert()` with Toast**
Ensure all room-level errors use the new toast system.

- [ ] **Step 4: Commit**
```bash
git add src/app/room/[code]/page.tsx
git commit -m "ui: optimize room page for mobile with responsive typography"
```

### Task 4: Final Validation

- [ ] **Step 1: Verify responsiveness on 375px viewport (Mobile)**
- [ ] **Step 2: Verify Toast animations and auto-dismiss**
- [ ] **Step 3: Run build and lint**
```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**
```bash
git commit -m "ui: final mobile refinements and toast validation"
```
