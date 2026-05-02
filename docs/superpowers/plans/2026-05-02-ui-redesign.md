# UI/UX Redesign & Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the TriviaDuel application with simplified language, standardized compact inputs, and a detailed results page showing player wagers, answers, and AI explanations.

**Architecture:** UI-First Refresh focusing on standardizing components and enhancing the results phase with data already stored in Redis, while updating the AI generation to include answer explanations.

**Tech Stack:** Next.js 15, Tailwind CSS 4, Google Gemini AI, Upstash Redis.

---

### Task 1: Update AI Generation to Include Explanations

**Files:**
- Modify: `src/app/api/generate-questions/route.ts`
- Modify: `src/lib/gemini.ts`

- [ ] **Step 1: Update prompt in API route**
Modify the prompt to include the `explanation` field.
```typescript
const prompt = `Generate 10 trivia questions about the topic: "${topic}". 
The output must be a valid JSON array of objects. 
Each object must have the following properties:
- id: a unique string for the question
- summary: short description
- text: full question
- type: "multiple_choice", "boolean", or "text"
- options: array of 4 strings or null
- correct_answer: the correct answer
- explanation: a brief, clear explanation of why the answer is correct

Respond ONLY with the JSON array.`;
```

- [ ] **Step 2: Update prompt in Gemini lib**
Ensure the fallback/primary lib matches the API route prompt.

- [ ] **Step 3: Commit**
```bash
git add src/app/api/generate-questions/route.ts src/lib/gemini.ts
git commit -m "feat: include explanation in AI question generation"
```

### Task 2: Standardize Inputs and Simplify Language on Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Standardize input sizes and simplified labels**
Update inputs to `h-10` and use playful terminology.
- `Identity Protocol` -> `Your Name`
- `Initialize Room` -> `Create Battle`
- `Inbound Access` -> `Join Battle`
- `Access Protocol Code` -> `Room Code`

- [ ] **Step 2: Implement Enter key submission with loading state**
Ensure inputs handle `onKeyDown` and buttons show loading states properly.

- [ ] **Step 3: Commit**
```bash
git add src/app/page.tsx
git commit -m "ui: standardize inputs and simplify language on landing page"
```

### Task 3: Update Room Page Types and Simplified Language

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Update Question type**
Add `explanation: string` to the `Question` type.

- [ ] **Step 2: Simplified terminology in UI**
- `Node Status` -> `Your Score`
- `Active Peers` -> `Players Online`
- `Establishing participant synchronization...` -> `Waiting for players...`
- `Eject` -> `Back to Menu`

- [ ] **Step 3: Standardize inputs and add Submit Answer button**
- Set inputs to `h-10`.
- Add a visible "Submit Answer" button in the `question` phase for text inputs.

- [ ] **Step 4: Commit**
```bash
git add src/app/room/[code]/page.tsx
git commit -m "ui: update room page types and simplified terminology"
```

### Task 4: Implement Detailed Results Page

**Files:**
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Add AI Explanation display**
Show `currentQuestion.explanation` prominently when `roomStatus === 'results'`.

- [ ] **Step 2: Add Detailed Player Results list**
Display a list of all `roundData.competitors` showing:
- Player name (match by ID from `players` state)
- Submitted answer
- Points wagered
- Correct/Incorrect status

- [ ] **Step 3: Commit**
```bash
git add src/app/room/[code]/page.tsx
git commit -m "feat: implement detailed results page with explanations and wagers"
```

### Task 5: Final Validation and Styling Tweaks

**Files:**
- Modify: `src/app/globals.css` (if needed)

- [ ] **Step 1: Verify 'Enter' key behavior across all phases**
- [ ] **Step 2: Ensure all labels are non-technical**
- [ ] **Step 3: Run build and lint**
```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**
```bash
git commit -m "ui: final styling tweaks and validation"
```
