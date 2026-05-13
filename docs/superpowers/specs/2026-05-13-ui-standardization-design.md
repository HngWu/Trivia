# Design Spec - UI Standardization and Bug Fixes

**Date:** 2026-05-13
**Status:** Approved
**Goal:** Address UI bugs related to excessive padding, large component sizes, and HeroUI technical errors.

## 1. Technical Fixes
### 1.1 HeroUI Table Row Header
- **Problem:** `ResultsView.tsx` throws a recoverable error: "A table must have at least one Column with the isRowHeader prop set to true".
- **Solution:** Add `isRowHeader` to the first `Table.Column` (Player) in `src/components/room/ResultsView.tsx`.

### 1.2 Leaderboard Visual Consistency
- **Problem:** The first-place player row in `FinalView.tsx` has a different background color than the parent glass container.
- **Solution:** Update `src/components/room/FinalView.tsx` to ensure the highlighted row background is consistent with the glass transparency or removed to match the container.

## 2. Layout Standardization
### 2.1 Button & Input Heights
Standardize heights across all components to create a more compact "Game" feel.

| Element Type | Old Height | New Height |
|--------------|------------|------------|
| Main Action Buttons | `h-16` / `h-20` / `h-24` | `h-12` (sm: `h-14`) |
| Option/Wager Buttons| `h-24` / `h-40` | `h-14` (sm: `h-16`) |
| Form Inputs | `h-14` / `h-16` | `h-12` |

**Affected Files:**
- `src/components/room/LobbyView.tsx`
- `src/components/room/WagerView.tsx`
- `src/components/room/QuestionView.tsx`
- `src/components/room/FinalView.tsx`
- `src/components/home/JoinGameForm.tsx`
- `src/components/home/TopicDetail.tsx`

### 2.2 Lobby Padding Reduction
- **Problem:** Excessive whitespace in the lobby.
- **Solution:** 
    - Reduce parent container padding.
    - Change Card padding from `p-5 sm:p-8` to `p-4 sm:p-6`.
    - Adjust vertical spacing (`mb-8` to `mb-4`).

## 3. Verification Plan
- **Manual Check:** Ensure buttons are no longer "oversized" on mobile and desktop.
- **Console Check:** Verify the Table Row Header error is gone.
- **Visual Check:** Verify the Leaderboard rows blend seamlessly.
