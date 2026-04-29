# TriviaDuel Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-stack web application replicating the core mechanics of "TriviaDuel.com" with a secure server-authoritative state.

**Architecture:** Next.js Server Actions manage state and anti-cheat validation. Supabase Realtime broadcasts UI state changes. Clients subscribe to Supabase channels but never receive the correct answers until the server reveals them.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Supabase, Jest + React Testing Library (for TDD).

---

### Task 1: Project Initialization & Config

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Create: `jest.config.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/init.test.js
describe('Project Init', () => {
  it('has testing configured', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest` (Will fail if jest isn't installed/configured)
Expected: Command not found or configuration error.

- [ ] **Step 3: Write minimal implementation**

Initialize Next.js and install dependencies.
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
npm install @supabase/supabase-js @supabase/ssr
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest
```

Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({ testEnvironment: 'jest-environment-jsdom' })
```

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: init nextjs with tailwind, supabase, and jest"
```

### Task 2: Supabase Schema & Types

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `src/lib/types/database.types.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/types.test.ts
import { Database } from '../src/lib/types/database.types'
describe('Database Types', () => {
  it('defines the rooms table', () => {
    type RoomRow = Database['public']['Tables']['rooms']['Row'];
    const room: RoomRow = { id: '1', code: 'A1B2', status: 'waiting', leader_id: 'p1', current_question_index: 0, topic: 'History' };
    expect(room.code).toBe('A1B2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/types.test.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/types/database.types.ts`:
```typescript
export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: { id: string; code: string; status: string; leader_id: string; current_question_index: number; topic: string; };
        Insert: { id?: string; code: string; status?: string; leader_id: string; current_question_index?: number; topic: string; };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      players: {
        Row: { id: string; room_id: string; name: string; score: number; available_weights: number[]; is_leader: boolean; };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'score' | 'available_weights'>;
        Update: Partial<Database['public']['Tables']['players']['Row']>;
      };
    };
  };
};
```

Create `supabase/migrations/0001_init.sql`:
```sql
CREATE TABLE rooms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'waiting', leader_id UUID, current_question_index INT DEFAULT 0, topic TEXT);
CREATE TABLE players (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID REFERENCES rooms(id), name TEXT, score INT DEFAULT 0, available_weights INT[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10], is_leader BOOLEAN DEFAULT FALSE);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/database.types.ts supabase/migrations/0001_init.sql
git commit -m "feat: setup database schema and types"
```

### Task 3: Game Room UI Components

**Files:**
- Create: `src/app/room/[code]/page.tsx`
- Test: `tests/room.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/room.test.tsx
import { render, screen } from '@testing-library/react'
import RoomPage from '../src/app/room/[code]/page'

describe('Room Page', () => {
  it('renders waiting lobby', () => {
    render(<RoomPage params={{ code: 'ABCD' }} />)
    expect(screen.getByText('Room: ABCD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/room.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/app/room/[code]/page.tsx
export default function RoomPage({ params }: { params: { code: string } }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold">Room: {params.code}</h1>
      <p className="mt-4">Waiting for leader to start...</p>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/room.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/room tests/room.test.tsx
git commit -m "feat: scaffold game room page UI"
```
