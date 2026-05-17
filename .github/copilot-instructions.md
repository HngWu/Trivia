# Copilot Instructions for TriviaDuel Clone

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local dev server on http://localhost:3000 |
| `npm run build` | Production build (next build) |
| `npm run lint` | Run ESLint on codebase |
| `npx jest` | Run all tests |
| `npx jest --testNamePattern="validator"` | Run specific test by name |
| `npx jest tests/validation.test.ts` | Run single test file |

## Architecture Overview

This is a **real-time multiplayer trivia game** with 4 critical architectural layers:

### 1. **State Management Layer**
- **Redis (Upstash):** Active game sessions (rooms, players, wagers) for low-latency sync and instant page reload recovery
- **Supabase Postgres:** Persistent archival of completed rounds and leaderboards, with Row-Level Security (RLS) enforcing authenticated-admin-only modifications
- **Next.js Server Actions** (`src/lib/actions.ts`): Server-authoritative game logic (scoring, wager validation, answer verification) to prevent client-side manipulation

### 2. **Real-Time Synchronization**
- **Supabase Broadcast:** Client-to-client signaling for game state transitions
- **Redis pub/sub fallback:** Ensures synchronization even if Broadcast is delayed
- **Optimistic UI updates:** Client assumes state change immediately, rolls back on error

### 3. **AI Generation (Multi-Model Fallback)**
1. **Primary:** Google Gemini 2.0 Flash (`gemini-2.0-flash`)
2. **Fallback 1:** DeepSeek (`deepseek-chat`) if Gemini throttled
3. **Fallback 2:** High-quality filler questions from Postgres
4. **Fallback 3:** Random questions from entire database
- **Critical:** Custom topics MUST generate via AI or error—no fallback to database questions for custom topics

### 4. **UI Layer**
- **Next.js Server Components:** Pre-render topics, topics list (cached in Redis)
- **React 19:** Client-side interactive components with async Server Actions
- **Tailwind CSS 4:** "Lume-Glass" dark theme (`#121212` base) with blur effects
- **HTML5 Canvas:** Three custom atmospheric backgrounds (Synapse, Synapse V2, Data Stream) with mouse interactivity

## Game State Loop

Games follow a strict 5-phase sequence. All transitions are server-authoritative:

```
waiting → wager → question → results → final
```

| Phase | Behavior |
|-------|----------|
| **waiting** | Lobby state; players join, leader waits for authorization to start |
| **wager** | Players independently select point multiplier (1–10) |
| **question** | Question revealed; players submit answers in real-time |
| **results** | Auto-transition after all answer; show correct answer and point deltas |
| **final** | Leaderboard; game over—option to rematch or return home |

Each phase is stored in `roomState.phase` (Redis) and synced via Supabase Broadcast.

## Core Systems

### Answer Validation (`src/lib/validation.ts`)
The `validateAnswer()` function enforces context-aware fuzzy matching:

- **Multiple-choice & boolean:** Exact match required
- **Text questions:** Fuzzy matching with stop-word filtering (e.g., "Einstein" matches "Albert Einstein")
  - Partial word matching within correct answer
  - Common stop words ("The", "And", "Of") ignored
- **Numerical tolerance:**
  - Years (4-digit): ±1 tolerance
  - Numbers 0–100: ±1 tolerance
  - Large numbers: 2% margin of error
  - Ranges: Validates if answer falls within range (e.g., "1990–1995")

### Error Handling (Toast System)
Replace `alert()` with the custom `Toast` component (`src/components/shared/Toast.tsx`):
```tsx
// ❌ Don't do this
alert("Connection lost");

// ✅ Do this
<Toast message="Connection lost" type="error" />
```

Toast is non-blocking and animated. Critical errors (join failures, desyncs) trigger toasts automatically.

### Accessibility & Shortcuts

| Shortcut | Action |
|----------|--------|
| **Escape** or **Browser Back** | Navigate to previous view (from any page) |
| **'J'** | Open Join Game form (from landing) |
| **1–4** | Select multiple-choice answer |
| **T/F** | Answer True/False questions |
| **Y/N** | Answer Yes/No questions |
| **1–9/0** | Select wager (1–10 points) |

All interactive elements have high-visibility focus rings for keyboard navigation.

### Mobile-First Responsiveness
- **Particle density:** Automatically reduced 45% on mobile for 60fps
- **Results view:** Desktop table → Mobile card list (smaller screens)
- **Boolean UI:** Dynamically switches between "True/False" and "Yes/No" based on question subtype
- **Adaptive layouts:** Font sizes and paddings scale based on viewport width

### Monitoring
- **Vercel Analytics:** Visitor traffic and engagement (auto-initialized in `RootLayout`)
- **Vercel Speed Insights:** Core Web Vitals tracking for performance debugging

## Coding Conventions

### File Structure
```
src/
  app/                          # Next.js App Router pages and layouts
    api/generate-questions/     # AI question generation endpoint
    room/                       # Game room pages
    admin/                      # Admin dashboard
    layout.tsx, page.tsx        # Root layout and landing page
  components/
    home/                       # Landing page (Topic selection, Join Game)
    room/                       # Real-time game loop (Lobby, Wagers, Question, Results)
    admin/                      # Admin tools
    shared/                     # Global UI (Toast, Background, Canvas engines)
  lib/
    actions.ts                  # Server Actions (state mutations, answer validation)
    ai.ts                       # AI providers (Gemini, DeepSeek)
    redis.ts                    # Redis operations (sync, caching)
    supabase/                   # Supabase client and RLS helpers
    validation.ts               # Answer fuzzy matching logic
    types/                      # TypeScript type definitions
    utils.ts                    # Utilities (room code generation, helpers)
    roasts.ts                   # End-game roast generation
    gemini.ts                   # Gemini-specific logic
    contexts/                   # React contexts (RoomContext, UserContext)
```

### Naming Conventions
- **Components, functions, variables:** CamelCase (e.g., `RoomPage`, `submitAnswer`, `playerCount`)
- **Directories:** kebab-case (e.g., `components/room`, `lib/types`)
- **Files:** Match exported symbol (e.g., `RoomPage.tsx` exports `RoomPage` component)

### React/TypeScript Patterns
- **Functional components only.** Use hooks for state and side effects.
- **Performance:** Use `useMemo` and `useCallback` liberally in real-time loops to prevent unnecessary re-renders.
- **Server Actions:** All game mutations go through `src/lib/actions.ts`, never direct API routes (except `/api/generate-questions`).
- **React 19 features:** Async Server Components, `use()` for unwrapping promises; mock `React.use()` in tests (see `tests/` for examples).

### Supabase RLS & Auth
- **Row-Level Security enforced:** Topics and questions table only allow authenticated admins to INSERT/UPDATE/DELETE.
- **checkAdmin():** Called server-side before any admin action to verify user credentials against auth metadata.
- **Broadcast for sync:** Use `supabase.channel('room:' + roomId)` to subscribe to state changes; always include `userId` in broadcast payloads for conflict detection.

### Redis Caching Strategy
- **Cache key format:** `cache:topics` (topic list), `room:{roomId}` (active game state)
- **TTL:** Topics cached indefinitely until admin CRUD; room state expires after 24 hours
- **Invalidation:** `clearCache('topics')` called after topic INSERT/UPDATE/DELETE in admin dashboard

## Database Schema

Located in `supabase/migrations/`:
- `0001_schema.sql`: Table definitions (`topics`, `questions`) with RLS policies
- `0002_data.sql`: Seed questions and core topics
- `0003_indexes.sql`: Strategic indexes on `(topic, name, created_at, text)` for query performance

**Critical indexes:**
- `topics(id)`: Primary key
- `questions(id, topic_id)`: Foreign key relationship
- `questions(text)`: Full-text search support for question content

## Testing

### Test File Organization
Tests live in `tests/` directory with names matching features:
- `validation.test.ts` – Answer fuzzy matching logic
- `room.test.tsx` – Game room component behavior
- `landing.test.tsx` – Landing page and topic selection
- `types.test.ts` – Type safety and inference

### Running Tests
```bash
# All tests
npx jest

# Single file
npx jest tests/validation.test.ts

# Specific test by name
npx jest --testNamePattern="fuzzy matching"

# Watch mode (re-run on file change)
npx jest --watch
```

### TDD Expectations
- New features should include corresponding test cases in `tests/`
- Answer validation changes → update `tests/validation.test.ts`
- Mock `React.use()` for async `params` in component tests (see existing tests for examples)
- Jest environment: `jest-environment-jsdom` with custom transformIgnorePatterns for Upstash Redis

## Next.js 16 Breaking Changes

⚠️ **This project uses Next.js 16 with breaking changes from earlier versions.** Before writing code involving:
- App Router APIs
- Server/Client component boundaries
- Data fetching patterns
- Middleware

Consult the official Next.js 16 guide in `node_modules/next/dist/docs/` to avoid deprecated patterns.

## Common Workflows

### Adding a New Question Type
1. Update `QuestionType` in `src/lib/types/index.ts`
2. Add AI generation logic in `src/lib/ai.ts` (in prompt)
3. Update validation rules in `src/lib/validation.ts`
4. Create component in `src/components/room/` (e.g., `MultiSelectQuestion.tsx`)
5. Add test case in `tests/validation.test.ts`
6. Update game state in `src/lib/actions.ts` if scoring differs

### Modifying Answer Validation
1. Edit `src/lib/validation.ts`
2. Add test cases in `tests/validation.test.ts`
3. Run `npx jest tests/validation.test.ts` to validate
4. Restart dev server for changes to apply (validation is called server-side)

### Adding Redis Caching
1. Import `redis` from `src/lib/redis.ts`
2. Call `redis.set(key, value)` with TTL: `redis.set(key, value, 'EX', 3600)`
3. Retrieve with `redis.get(key)`
4. Invalidate on admin actions with `redis.del(key)`
5. Test cache invalidation in admin dashboard

### Deploying to Production
1. Run `npm run build` locally to catch build errors
2. Run `npm run lint` to ensure code passes ESLint
3. Push to main branch; Vercel auto-deploys
4. Check Vercel Analytics and Speed Insights post-deployment

## Debugging Tips

- **Redis desync:** Check `console.log()` in Server Actions and compare `roomState` against Redis via Upstash dashboard
- **Broadcast delays:** Subscribe to channel with `.on('*')` to see all events in browser console
- **Answer validation edge cases:** Add logging in `validateAnswer()` before comparing strings
- **Mobile rendering issues:** Inspect with Chrome DevTools Mobile View; check Canvas particle density reduction
- **AI generation failures:** Add error boundary around question generation; falls back to DeepSeek, then database

---

**See also:** [GEMINI.md](../GEMINI.md) for detailed system architecture, [CLAUDE.md](../CLAUDE.md) for AI guidelines.
