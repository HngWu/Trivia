# TriviaDuel Clone - Project Instructions

## Project Overview
This project is a full-stack real-time multiplayer trivia application, replicating the core mechanics of "TriviaDuel.com". It features dynamic question generation via Gemini AI, secure wagering, and instant synchronization between up to 10 players.

### Core Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **AI Integration:** Google Gemini SDK (`@google/generative-ai`)
- **Real-time State:** Upstash Redis (`@upstash/redis`)
- **Persistence & Auth:** Supabase (Postgres + RLS)
- **Testing:** Jest & React Testing Library

### Architecture
- **Server-Authoritative State:** All critical game logic (scoring, wager validation, answer verification) happens on the server via Next.js Server Actions. Correctness and score deltas are calculated on the server to prevent client-side manipulation.
- **Redis Sync:** Active game sessions (rooms, players, wagers) are stored in Redis for low-latency synchronization and restored on page reloads.
- **Supabase Persistence:** Room archival and permanent records are stored in Postgres. Supabase Broadcast is used for real-time signaling between clients.
- **Graceful Fallback:** If Gemini AI is throttled or fails, the application automatically falls back to a pool of 50+ high-quality "filler questions" stored in the database.

---

## Core Systems

### Fuzzy Answer Matching
The application uses a robust `validateAnswer` utility (`src/lib/validation.ts`) to provide a fair and forgiving experience:
- **Exact Matching:** Case-insensitive string comparison.
- **Numerical Tolerance:** Accepts answers within ±1 for small numbers/years or within a 2% margin for larger values.
- **Range Support:** Handles ranges in correct answers (e.g., "1990-1995") and validates if the user's number falls within it.
- **Partial Name Matching:** If the correct answer is multi-word (e.g., "Albert Einstein"), the system accepts single significant words (e.g., "Einstein"), while filtering out common stop words ("The", "And").
- **Normalization:** Strips common punctuation and extra whitespace before comparison.

### Mobile UX & Responsiveness
Designed with a "Mobile First" philosophy:
- **Adaptive Layouts:** Paddings and font sizes scale based on screen width.
- **Mobile Results View:** The desktop results table is replaced by a high-contrast card list on smaller screens for better readability.
- **Touch-Friendly UI:** Large buttons and inputs optimized for mobile interaction.

### Error Handling (Toast System)
A custom, animated `Toast` component (`src/components/Toast.tsx`) replaces standard `alert()` calls, providing a non-blocking and polished user feedback loop for errors like joining failures or desyncs.

---

## Building and Running

### Prerequisites
Ensure you have the following environment variables set in your `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Commands
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
- **Unit Tests:** `npx jest`

---

## Development Conventions

### Coding Style
- **Components:** Functional React components with hooks. Prefer `useMemo` and `useCallback` for performance stability in real-time loops.
- **API Routes:** Located in `src/app/api/`. Currently includes `/api/generate-questions`.
- **Server Actions:** Primary entry points for game state changes, located in `src/lib/actions.ts`. These are server-authoritative.
- **Naming:** CamelCase for files/components, kebab-case for directories.

### Game State Loop
The game follows a strict phase-based sequence:
1. **`waiting` (Lobby):** Waiting for players and leader authorization.
2. **`wager` (Strategy):** Players independently pick point weights (1-10).
3. **`question` (Battle):** Question is revealed; players submit answers.
4. **`results` (Resolve):** Automated transition once everyone has answered; correct answer and point deltas shown.
5. **`final` (End):** Final leaderboard and standings.

### Database Schema
Managed via Supabase migrations in `supabase/migrations/`:
- `rooms`: Metadata and status.
- `players`: Participant scores and identity.
- `questions`: Specific questions for the active match.
- `answers`: Player wagers and responses.
- `filler_questions`: Seed data for offline/fallback mode.

### Testing Practices
- **TDD:** New features should include a test case in `tests/`.
- **Validation Testing:** Use `tests/validation.test.ts` for any updates to answer verification logic.
- **Next.js 15 Compatibility:** Mock `React.use()` for unwrapping dynamic `params` in tests.
