# Design Spec: Filter Playable Topics by Question Count (>= 10)

## Overview
Only show topics on the public home page that have at least 10 questions in the database, while preserving the "Custom" AI topic. The Admin portal (`/admin/topics` and `/admin/questions`) continues to display all topics regardless of question count.

## Motivation & Goals
- Players should not be able to select topics from the home page that have insufficient questions (e.g. 0 questions), which could lead to empty rounds or gameplay failures.
- Topics with at least 10 questions should be visible and selectable.
- The "Custom" topic must remain visible as questions are generated on demand by AI.
- Administrators must still see all topics in the admin dashboard so they can manage them, add questions, and inspect counts.

## Architecture & Data Flow

### 1. Public Home Page (`src/app/page.tsx`)
- Instead of calling `getTopics()`, the page calls `getPlayableTopics(10)`.
- `getPlayableTopics(minQuestions: number = 10)` in `src/lib/actions.ts`:
  1. Concurrently fetches topics via `getTopics()` and topic counts via `getQuestionCountsByTopic()`.
  2. Filters the topics based on the condition:
     - `topic.id.toLowerCase() === 'custom'`, OR
     - `(counts[topic.id.toLowerCase()] ?? 0) >= minQuestions`
  3. Returns the filtered `Topic[]`.
- `HomeClient` receives this list as `initialTopics` and renders them in `TopicGrid`.

### 2. Admin Management (`src/app/admin/topics/page.tsx` & `src/app/admin/questions/page.tsx`)
- Continues calling `getTopics()` and `getQuestionCountsByTopic()` directly.
- All topics remain visible in the Admin UI so admins can view topics with 0 questions and add new questions to them.

## Implementation Details

### `src/lib/actions.ts`
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

### `src/app/page.tsx`
```typescript
import { getPlayableTopics } from '@/lib/actions';
import HomeClient from '@/components/home/HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const topics = await getPlayableTopics(10);
  
  return <HomeClient initialTopics={topics || []} />;
}
```

## Edge Cases & Error Handling
- **Database Error in `getQuestionCountsByTopic`**: Catches and defaults to empty counts `{}`. In that case, only `custom` will show, avoiding broken games.
- **Case Sensitivity**: All topic ID comparisons against the question count map are normalized with `.toLowerCase()`.
- **Custom Topic**: Always allowed since it relies on AI generation rather than database question pool.

## Testing Strategy
- **Unit Test (`tests/topics.test.ts`)**:
  - Test `getPlayableTopics` filtering topics with < 10 questions.
  - Test `getPlayableTopics` preserving topics with >= 10 questions.
  - Test `getPlayableTopics` preserving `custom` topic with 0 questions.
  - Test case-insensitivity of topic IDs vs question count keys.
- **Verification**: Run `npm test` and build check.
