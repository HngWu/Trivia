# Filter Playable Topics by Question Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only show topics with at least 10 database questions (plus the "Custom" AI topic) on the public home page, while leaving the Admin portal showing all topics.

**Architecture:** Add a new `getPlayableTopics(minQuestions: number = 10)` Server Action in `src/lib/actions.ts` that fetches topics and question counts concurrently, then filters for `topic.id === 'custom'` or `count >= minQuestions`. Update `src/app/page.tsx` and its test mocks to use `getPlayableTopics()`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Jest, `@testing-library/react`.

---

### Task 1: Create `getPlayableTopics` Server Action with TDD

**Files:**
- Create: `tests/playable_topics.test.ts`
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Write the failing tests in `tests/playable_topics.test.ts`**

```typescript
/**
 * @jest-environment node
 */
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  },
  ROOM_TTL: 3600
}));

import { getPlayableTopics, getTopics, invalidateTopicCache } from '@/lib/actions';
import { getDatabase } from '@/lib/db';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';
import { Question, Topic } from '@/lib/types/game';

describe('getPlayableTopics', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    invalidateTopicCache();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('filters out topics with fewer than 10 questions but keeps topics with >= 10 questions', async () => {
    const db = await getDatabase();
    
    // Add a low-count topic with only 3 questions
    const lowTopic: Topic = { id: 'low-topic', name: 'Low Topic', icon: '📉' };
    await db.addTopic(lowTopic);
    const lowQuestions: Question[] = [1, 2, 3].map(i => ({
      id: `low-q-${i}`,
      topic: 'low-topic',
      summary: `Summary ${i}`,
      text: `Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(lowQuestions);

    // Add a high-count topic with 12 questions
    const highTopic: Topic = { id: 'high-topic', name: 'High Topic', icon: '📈' };
    await db.addTopic(highTopic);
    const highQuestions: Question[] = Array.from({ length: 12 }, (_, i) => ({
      id: `high-q-${i}`,
      topic: 'high-topic',
      summary: `High Summary ${i}`,
      text: `High Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(highQuestions);

    const playable = await getPlayableTopics(10);
    const playableIds = playable.map(t => t.id.toLowerCase());

    expect(playableIds).toContain('high-topic');
    expect(playableIds).not.toContain('low-topic');
  });

  it('always includes the "custom" topic even if it has 0 database questions', async () => {
    const db = await getDatabase();
    await db.addTopic({ id: 'custom', name: 'Custom', icon: '✨' });

    const playable = await getPlayableTopics(10);
    const playableIds = playable.map(t => t.id.toLowerCase());

    expect(playableIds).toContain('custom');
  });

  it('handles case-insensitivity between topic ID and question topic count key', async () => {
    const db = await getDatabase();
    await db.addTopic({ id: 'MixedCaseTopic', name: 'Mixed Case', icon: '🔤' });
    const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
      id: `mixed-q-${i}`,
      topic: 'mixedcasetopic',
      summary: `Mixed Summary ${i}`,
      text: `Mixed Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(questions);

    const playable = await getPlayableTopics(10);
    const match = playable.find(t => t.id === 'MixedCaseTopic');
    expect(match).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/jest/bin/jest.js tests/playable_topics.test.ts`
Expected: FAIL with `getPlayableTopics is not a function` or import error.

- [ ] **Step 3: Implement `getPlayableTopics` in `src/lib/actions.ts`**

In `src/lib/actions.ts`, add:
```typescript
export async function getPlayableTopics(minQuestions: number = 10): Promise<Topic[]> {
  const [topics, counts] = await Promise.all([
    getTopics(),
    getQuestionCountsByTopic().catch(() => ({} as Record<string, number>))
  ]);

  return (topics || []).filter(topic => {
    if (topic.id.toLowerCase() === 'custom') return true;
    const count = counts[topic.id.toLowerCase()] || 0;
    return count >= minQuestions;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/playable_topics.test.ts`
Expected: PASS (all 3 tests pass).

- [ ] **Step 5: Commit changes**

```bash
git add tests/playable_topics.test.ts src/lib/actions.ts
git commit -m "feat: add getPlayableTopics action to filter topics by question count"
```

---

### Task 2: Update Home Page & Integration Tests

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `tests/landing.test.tsx`

- [ ] **Step 1: Update `tests/landing.test.tsx` to mock `getPlayableTopics`**

In `tests/landing.test.tsx`, update the `jest.mock('../src/lib/actions')` mock:
```typescript
jest.mock('../src/lib/actions', () => ({
  createRoom: jest.fn(),
  joinRoom: jest.fn(),
  getTopics: jest.fn().mockResolvedValue([
    { id: 'history', name: 'History', icon: '📜', description: 'Past events', example_question: 'Who was the first president?' }
  ]),
  getPlayableTopics: jest.fn().mockResolvedValue([
    { id: 'history', name: 'History', icon: '📜', description: 'Past events', example_question: 'Who was the first president?' }
  ]),
}));
```

- [ ] **Step 2: Update `src/app/page.tsx` to call `getPlayableTopics(10)`**

In `src/app/page.tsx`:
```typescript
import { getPlayableTopics } from '@/lib/actions';
import HomeClient from '@/components/home/HomeClient';

export const dynamic = 'force-dynamic'; // Ensure we always get fresh data if needed, or use revalidate

export default async function Home() {
  const topics = await getPlayableTopics(10);
  
  return <HomeClient initialTopics={topics || []} />;
}
```

- [ ] **Step 3: Run landing page test and playable topics test**

Run: `node ./node_modules/jest/bin/jest.js tests/landing.test.tsx tests/playable_topics.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit changes**

```bash
git add src/app/page.tsx tests/landing.test.tsx
git commit -m "feat: use getPlayableTopics on home page to only show topics with >= 10 questions"
```

---

### Task 3: Full Verification & Build Check

**Files:**
- Check: `src/app/admin/topics/page.tsx` (ensure it still uses `getTopics()`)
- Check: `src/app/admin/questions/page.tsx` (ensure it still uses `getTopics()`)

- [ ] **Step 1: Run full test suite**

Run: `node ./node_modules/jest/bin/jest.js`
Expected: All test suites pass.

- [ ] **Step 2: Run Next.js build verification**

Run: `node scripts/init-db.mjs && npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit any remaining changes if needed**
