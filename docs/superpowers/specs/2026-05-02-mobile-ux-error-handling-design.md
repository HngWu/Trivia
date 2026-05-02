# TriviaDuel: Mobile UX & Error Handling Specification

**Status:** Approved
**Topic:** Mobile Optimization & Toast Notifications
**Date:** 2026-05-02

## 1. Responsive Typography & Scaling

### 1.1 Header Scaling
Massive headers must scale down on smaller viewports to prevent horizontal overflow and poor ergonomics:
- **Title (Home):** `text-6xl sm:text-8xl`
- **Phase Headers (Lobby, Terminated):** `text-5xl sm:text-9xl`
- **Result Status (Passed/Failed):** `text-6xl sm:text-[16rem]`
- **Correct Answer:** `text-3xl sm:text-7xl`

### 1.2 Interactive Elements
- **Start/Join Buttons:** Reduce padding on mobile from `py-8` to `py-5`.
- **Wager Cards:** Reduce size from `h-32` to `h-24` on mobile.
- **Round Summary Table:** On mobile (`< 640px`), the table should switch to a stacked layout or a condensed scrollable view.

## 2. Multi-Step Mobile Flow (Landing Page)

### 2.1 View Transition
On mobile devices (`< 768px`):
1.  **Grid View:** Only the "Join a Battle" button and the "Category Grid" are visible.
2.  **Creation View:** Upon selecting a topic, the Grid is hidden, and a "Creation Screen" is shown containing:
    - Topic icon/name header.
    - Description & Example.
    - Name Input & Create Button.
    - "Back to Categories" link/button.

## 3. Toast Notification System

### 3.1 Visuals
- **Location:** Top-center or bottom-center.
- **Style:** `glass` effect with high-contrast background (e.g., `bg-red-500/80` for errors).
- **Animation:** Slide down from top or slide up from bottom.
- **Duration:** Auto-dismiss after 4 seconds.

### 3.2 Error Scenarios
Replace all existing `alert()` calls with `showToast()`:
- "Please enter both your name and a room code."
- "Room not found or failed to join."
- "Failed to create room. Please try again."
- "Invalid wager."

## 4. Technical Tasks
- Create `src/components/Toast.tsx` and `src/hooks/useToast.ts` (or integrated in a context).
- Update `src/app/page.tsx` with responsive layout logic and step-based creation.
- Update `src/app/room/[code]/page.tsx` with responsive text and wager scaling.
- Clean up all `alert()` instances.
