# AI Generation Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update AI question generation to include a brief explanation for each correct answer and display it in the results UI.

**Architecture:** Modify Gemini AI prompts to include an `explanation` field in the JSON response. Update database types and local UI types to support this field. Display the explanation during the `results` phase in the game room.

**Tech Stack:** Next.js, TypeScript, Gemini AI, Tailwind CSS.

---

### Task 1: Update Database and UI Types

**Files:**
- Modify: `src/lib/types/database.types.ts`
- Modify: `src/app/room/[code]/page.tsx`

- [x] **Step 1: Add explanation field to Database types**

Modify `src/lib/types/database.types.ts` to include `explanation` in the `questions` table.

- [x] **Step 2: Add explanation field to Room Page Question type**

The `Question` type in `src/lib/types/game.ts` was updated to include `explanation: string;`.

### Task 2: Update AI Generation Prompts

**Files:**
- Modify: `src/app/api/generate-questions/route.ts`
- Modify: `src/lib/gemini.ts`

- [x] **Step 1: Update prompt in API route**

- [x] **Step 2: Update prompt in Gemini lib**

The Gemini prompt in `src/lib/gemini.ts` now requests an `explanation` field.

### Task 3: Display Explanations in UI

**Files:**
- Modify: `src/components/room/ResultsView.tsx`

- [x] **Step 1: Render explanation in Results phase**

`ResultsView.tsx` was updated to display `roundData.results.explanation` when available.

### Task 4: Verification

- [x] **Step 1: Run lint**
- [x] **Step 2: Add/Update tests**
  Created `tests/explanation.test.tsx` to verify the UI displays the explanation.

---
