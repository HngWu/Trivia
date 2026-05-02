# Modern Dark Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign TriviaDuel with a fixed dark theme, a new landing page layout (carousel), and smart room onboarding via invite links.

**Architecture:** Global CSS overhaul for the new color palette, refactoring the `Home` component for dynamic category selection, and updating `RoomPage` to handle identity checks for direct links.

**Tech Stack:** Next.js 16, Tailwind CSS 4, HSL Color Palette.

---

### Task 1: Global Theme & Style Overhaul

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Delete: `src/components/ThemeToggle.tsx`
- Delete: `src/components/ThemeProvider.tsx`

- [ ] **Step 1: Update `globals.css` with fixed HSL colors**
```css
:root {
  --background: 217.2 32.6% 17.5%; /* hsl(217.2 32.6% 17.5%) */
  --foreground: 215 20.2% 65.1%;   /* hsl(215 20.2% 65.1%) */
  --accent: 0 0% 100%;             /* white */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 2: Remove `ThemeProvider` from `layout.tsx`**
Ensure the `html` tag is hardcoded with `className="dark"` and `style={{ backgroundColor: 'hsl(var(--background))' }}`.

- [ ] **Step 3: Delete theme components and remove imports**
Clean up any remaining references in the codebase.

- [ ] **Step 4: Commit**
```bash
git add src/app/globals.css src/app/layout.tsx
git rm src/components/ThemeToggle.tsx src/components/ThemeProvider.tsx
git commit -m "style: implement fixed dark theme and remove theme toggling"
```

### Task 2: Redesign Landing Page with Carousel

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement "Join Battle" top section**
Add a button at the top that toggles a compact input field for the room code.

- [ ] **Step 2: Implement Category Carousel**
Define metadata for each category (name, description, example question). Render them in a horizontal scrollable container.

- [ ] **Step 3: Implement Dynamic Selection View**
When a category is clicked, show the name input and "Create Battle" button below the carousel, along with the category's description and example question.

- [ ] **Step 4: Commit**
```bash
git add src/app/page.tsx
git commit -m "ui: redesign landing page with join button and category carousel"
```

### Task 3: Room Link Sharing & Smart Onboarding

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add "Copy Invite Link" functionality**
Use `navigator.clipboard.writeText` to copy the current URL. Show a "Copied!" feedback state.

- [ ] **Step 2: Implement identity check on mount**
In `useEffect`, check `localStorage` for `player_name`. If missing, set a new state `showNamePrompt` to `true`.

- [ ] **Step 3: Implement Name Prompt Modal/Overlay**
If `showNamePrompt` is true, render a centered overlay asking for their name before showing the lobby content.

- [ ] **Step 4: Commit**
```bash
git add src/app/room/[code]/page.tsx
git commit -m "feat: implement invite link sharing and smart room onboarding"
```

### Task 4: Final Validation

- [ ] **Step 1: Verify layout responsiveness**
- [ ] **Step 2: Test link join flow with/without existing name**
- [ ] **Step 3: Run build and lint**
```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**
```bash
git commit -m "ui: final refinements for Modern Dark Refresh"
```
