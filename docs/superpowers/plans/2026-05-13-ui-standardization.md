# UI Standardization and Technical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize component heights for a more compact UI and fix HeroUI technical errors.

**Architecture:** Surgical Tailwind class updates and HeroUI prop adjustments to existing functional components.

**Tech Stack:** Next.js 16, HeroUI v3 (Alpha), Tailwind CSS 4.

---

### Task 1: Fix ResultsView Table Accessibility

**Files:**
- Modify: `src/components/room/ResultsView.tsx`

- [ ] **Step 1: Add isRowHeader prop to the Player column**

```tsx
// src/components/room/ResultsView.tsx

// Locate <Table.Column> for Player and add isRowHeader={true}
<Table.Column isRowHeader className="px-8 py-4 text-[10px] font-bold text-gray-500 tracking-widest uppercase bg-transparent border-none">Player</Table.Column>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/room/ResultsView.tsx
git commit -m "fix(ui): add isRowHeader to ResultsView table for HeroUI compliance"
```

---

### Task 2: Standardize LobbyView Layout and Heights

**Files:**
- Modify: `src/components/room/LobbyView.tsx`

- [ ] **Step 1: Reduce vertical padding and spacing**

```tsx
// src/components/room/LobbyView.tsx

// Change mb-8 to mb-4 in the header section
<div className="text-center space-y-3 mb-4">

// Change card padding from p-5 sm:p-8 to p-4 sm:p-6
<Card className="glass p-4 sm:p-6 rounded-[2rem] w-full max-w-lg space-y-6 border-white/[0.03] shadow-xl relative overflow-visible bg-transparent">
```

- [ ] **Step 2: Reduce Start Game button height**

```tsx
// src/components/room/LobbyView.tsx

// Change h-16 to h-12 (sm: h-14)
<Button 
  disabled={questionsCount === 0 || isLocked} 
  onPress={onStart} 
  className="w-full h-12 sm:h-14 rounded-2xl font-bold text-lg bg-white/10 border-white/20 text-foreground glass focus:ring-2 focus:ring-white/20 focus:outline-none"
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/room/LobbyView.tsx
git commit -m "style(ui): reduce lobby padding and start button height"
```

---

### Task 3: Standardize WagerView Button Heights

**Files:**
- Modify: `src/components/room/WagerView.tsx`

- [ ] **Step 1: Reduce wager button heights**

```tsx
// src/components/room/WagerView.tsx

// Change h-16 sm:h-24 to h-12 sm:h-16
<Button 
  key={weight} 
  isDisabled={isUsed || isLocked} 
  onPress={() => onSelectWager(weight)} 
  className={`h-12 sm:h-16 rounded-xl sm:rounded-2xl font-bold text-2xl sm:text-3xl transition-all border-2 relative overflow-hidden group shadow-lg min-w-0 p-0 ${
    isUsed || isLocked
    ? "bg-transparent border-white/5 text-gray-900 cursor-not-allowed" 
    : "glass-button !border-white/10 hover:!border-white/30"
  }`}
>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/room/WagerView.tsx
git commit -m "style(ui): reduce wager button heights in WagerView"
```

---

### Task 4: Standardize QuestionView Heights

**Files:**
- Modify: `src/components/room/QuestionView.tsx`

- [ ] **Step 1: Reduce Text Answer input and button heights**

```tsx
// src/components/room/QuestionView.tsx

// Change h-14 to h-12 (input) and button from h-14 to h-12
<Input 
  autoFocus 
  placeholder="Type your answer..." 
  className="glass !border-white/10 h-12 rounded-xl px-4 font-semibold text-lg"
/>

<Button 
  type="submit"
  isDisabled={isLocked || !textAnswer.trim()}
  className="w-full sm:w-auto h-12 px-10 bg-foreground text-background rounded-xl font-bold text-lg hover:bg-white transition-all active:scale-95"
>
```

- [ ] **Step 2: Reduce Boolean and Multiple Choice button heights**

```tsx
// src/components/room/QuestionView.tsx

// Boolean buttons: Change h-24 sm:h-40 to h-16 sm:h-24
<Button
  key={opt}
  onPress={() => onAnswerChange(opt)}
  className={`h-16 sm:h-24 rounded-[2rem] font-bold text-2xl sm:text-3xl transition-all border-2 relative group overflow-hidden ${
    roundData.answer === opt 
      ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-[1.02]" 
      : "glass border-white/10 text-gray-500 hover:border-white/30 hover:text-foreground"
  }`}
  disabled={isLocked || !!roundData.submittedAnswer}
>

// Multiple Choice buttons: Change h-20 sm:h-28 to h-14 sm:h-16
<Button
  key={opt}
  onPress={() => onAnswerChange(opt)}
  className={`h-14 sm:h-16 rounded-2xl sm:rounded-3xl font-bold text-base sm:text-lg px-6 sm:px-8 transition-all border-2 flex justify-start text-left relative group ${
    roundData.answer === opt 
      ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.15)] scale-[1.02]" 
      : "glass border-white/10 text-gray-500 hover:border-white/30 hover:text-foreground"
  }`}
  disabled={isLocked || !!roundData.submittedAnswer}
>

// Lock Selection button: Change h-16 sm:h-20 to h-12 sm:h-14
<Button
  onPress={onSubmitAnswer}
  disabled={isLocked || !roundData.answer || !!roundData.submittedAnswer}
  className="w-full h-12 sm:h-14 rounded-2xl font-bold text-lg bg-foreground text-background hover:bg-white transition-all shadow-xl uppercase tracking-widest"
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/room/QuestionView.tsx
git commit -m "style(ui): reduce component heights in QuestionView"
```

---

### Task 5: Standardize FinalView Heights and Visuals

**Files:**
- Modify: `src/components/room/FinalView.tsx`

- [ ] **Step 1: Fix leaderboard row background and reduce rank spacing**

```tsx
// src/components/room/FinalView.tsx

// Remove bg-white/[0.05] from the first row and reduce rank padding
<div className={`flex items-center justify-between p-4 sm:p-6 transition-all`}>
```

- [ ] **Step 2: Reduce Leave Game button height**

```tsx
// src/components/room/FinalView.tsx

// Change h-16 sm:h-20 to h-12 sm:h-14
<Button 
  onPress={onHome} 
  className="mt-16 sm:mt-24 glass !border-white/10 px-16 sm:px-32 h-12 sm:h-14 rounded-2xl font-bold text-xl transition-all active:scale-95 bg-white/5 hover:bg-foreground hover:text-background uppercase tracking-widest"
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/room/FinalView.tsx
git commit -m "style(ui): reduce button height and fix leaderboard visuals in FinalView"
```

---

### Task 6: Standardize Home Components Heights

**Files:**
- Modify: `src/components/home/JoinGameForm.tsx`
- Modify: `src/components/home/TopicDetail.tsx`

- [ ] **Step 1: Update JoinGameForm input and button heights**

```tsx
// src/components/home/JoinGameForm.tsx

// Change input h-12 to h-10 (keep h-12 if h-10 is too small for touch) -> Let's try h-11/12
// Actually, let's keep h-12 for inputs as it's a good standard, but reduce buttons to match.
// Let's set both to h-12.

// Join button: Change h-12 to h-12 (already h-12, good)
```

- [ ] **Step 2: Update TopicDetail create button height**

```tsx
// src/components/home/TopicDetail.tsx

// Change py-6 h-auto to h-14
<Button
  type="submit"
  isLoading={isLoading}
  disabled={!nickname || (topicData.id === 'custom' && !customTopic) || isLoading}
  className="w-full h-14 rounded-xl font-bold text-lg bg-foreground text-background hover:bg-white transition-all"
>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/home/JoinGameForm.tsx src/components/home/TopicDetail.tsx
git commit -m "style(ui): standardize home component action heights"
```

---

### Task 7: Verification

- [ ] **Step 1: Check for Table error in console**
- [ ] **Step 2: Visual inspection of all views (Lobby, Wager, Question, Results, Final)**
