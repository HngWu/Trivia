# TriviaDuel Redesign Specification

**Status:** Approved
**Topic:** UI/UX Redesign & Feature Enhancement
**Date:** 2026-05-02

## 1. Objective
Redesign the TriviaDuel application to improve user experience through simplified language, standardized UI components, and enhanced feedback during the results phase.

## 2. Visual & Language Changes

### 2.1 Typography
- **Primary Font:** Inter (Sans-Serif).
- **Style:** Clean, professional, and highly readable.

### 2.2 Simplified Terminology
Technical jargon will be replaced with playful and competitive language:
- `Identity Protocol` -> `Your Name`
- `Initialize Room` -> `Create Battle`
- `Inbound Access` -> `Join Battle`
- `Access Protocol Code` -> `Room Code`
- `Node Status` -> `Your Score`
- `Establishing participant synchronization...` -> `Waiting for players...`
- `Nodes/Peers` -> `Players`

## 3. UI Component Standards

### 3.1 Standardized Inputs
- **Height:** Consistent `h-10` (2.5rem) for all text inputs.
- **Styling:** Compact borders, consistent padding, and clear placeholder text.
- **Behavior:**
    - Pressing `Enter` in any input field triggers the primary action.
    - Immediate `loading` state upon submission to disable inputs and buttons, preventing double-submits.

### 3.2 Question Phase
- **Submit Button:** A "Submit Answer" button will be added next to or below the text input field for better mobile and desktop UX.

## 4. Enhanced Results Phase

### 4.1 AI Explanation
- Each question will now include an `explanation` field explaining *why* the answer is correct.
- This explanation will be displayed prominently at the top of the Results phase.

### 4.2 Detailed Player Results
- A list/table view showing all players' performance in the current round:
    - **Player Name**
    - **Submitted Answer**
    - **Points Wagered**
    - **Status** (Correct/Incorrect/Pending)

## 5. Technical Requirements

### 5.1 Data Structure Updates
Update `Question` type in `src/app/room/[code]/page.tsx` and anywhere else used:
```typescript
type Question = {
  // ... existing fields
  explanation: string;
};
```

### 5.2 API Updates
- Update `src/app/api/generate-questions/route.ts` to include explanations in the AI prompt and response.
- Update `src/lib/actions.ts` to ensure `explanation` is persisted in Redis.

## 6. Success Criteria
- [ ] Interface uses simplified, non-technical language.
- [ ] All inputs are standardized in size and support 'Enter' submission.
- [ ] Results page shows player wagers, answers, and the correct answer explanation.
- [ ] Loading states prevent double-submits.
