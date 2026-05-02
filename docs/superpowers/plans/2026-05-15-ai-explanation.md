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

- [ ] **Step 1: Add explanation field to Database types**

Modify `src/lib/types/database.types.ts` to include `explanation` in the `questions` and `filler_questions` tables (even though they are not in migrations yet, it's good for type safety).
Wait, I should check if `filler_questions` is in `database.types.ts`. I didn't see it before.

```typescript
// src/lib/types/database.types.ts
// ... in questions.Row and questions.Insert
          correct_answer: string;
          explanation: string; // Add this
```

- [ ] **Step 2: Add explanation field to Room Page Question type**

Modify `src/app/room/[code]/page.tsx` to update the local `Question` type.

```typescript
type Question = {
  id: string;
  summary: string;
  text: string;
  type: "multiple_choice" | "boolean" | "text";
  options: string[] | null;
  correct_answer: string;
  explanation: string; // Add this
};
```

### Task 2: Update AI Generation Prompts

**Files:**
- Modify: `src/app/api/generate-questions/route.ts`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Update prompt in API route**

Modify the `prompt` variable in `src/app/api/generate-questions/route.ts` to include the `explanation` property.

- [ ] **Step 2: Update prompt in Gemini lib**

Modify the `prompt` variable in `src/lib/gemini.ts` to include the `explanation` property.

### Task 3: Display Explanations in UI

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Render explanation in Results phase**

Update the results section in `src/app/room/[code]/page.tsx` to show the explanation below the correct answer.

### Task 4: Verification

- [ ] **Step 1: Run lint**
- [ ] **Step 2: Add/Update tests**
  Create `tests/explanation.test.tsx` to verify the UI displays the explanation.

---
