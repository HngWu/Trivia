# TriviaDuel Clone - Project Instructions

## Project Overview
This project is a full-stack real-time multiplayer trivia application, replicating the core mechanics of "TriviaDuel.com". It features dynamic question generation via Gemini AI, secure wagering, and instant synchronization between up to 10 players.

### Technologies & Tech Stack
The application is built using a modern, performant, and type-safe stack:
- **Core Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Runtime State:** [Upstash Redis](https://upstash.com/) (REST-based serverless Redis)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security)
- **AI Engine:** [Google Gemini 2.0 Flash](https://ai.google.dev/) (Primary) & [DeepSeek](https://www.deepseek.com/) (Fallback)
- **Monitoring:** [Vercel Analytics](https://vercel.com/analytics) & [Speed Insights](https://vercel.com/speed-insights)

### Main Libraries
- **`@google/generative-ai`**: Official SDK for Gemini AI integration.
- **`@upstash/redis`**: Low-latency REST client for state synchronization.
- **`@supabase/supabase-js`**: Client for persistence, RLS, and real-time signaling.
- **`@supabase/ssr`**: Server-side rendering helpers for Supabase auth and client management.
- **`crypto`**: Node.js native module for secure UUID and room code generation.
- **`react` 19**: Utilizing the latest concurrent features and server actions.

### UI & UX Libraries
- **Vanilla CSS & HTML5 Canvas**: Custom-built high-performance background engines (Synapse, Data Stream).
- **Tailwind CSS 4**: Utility-first styling with the latest JIT engine for "Lume-Glass" aesthetics.
- **Geist Sans & Mono**: Modern typography via `next/font`.
- **Custom Toast Engine**: Lightweight, animated notification system built from scratch for non-blocking feedback.

### Architecture
- **Server-Authoritative State:** All critical game logic (scoring, wager validation, answer verification) happens on the server via Next.js Server Actions. Correctness and score deltas are calculated on the server to prevent client-side manipulation.
- **Redis Sync:** Active game sessions (rooms, players, wagers) are stored in Redis for low-latency synchronization and restored on page reloads.
- **Supabase Persistence:** Room archival and permanent records are stored in Postgres. Supabase Broadcast is used for lightweight real-time signaling (signals trigger a re-fetch from Redis rather than carrying full state payloads to avoid payload size limits).
- **Optimized Loading:** The application uses **Next.js Server Components** to pre-render topics and data, ensuring instant page loads without client-side waterfalls.
- **Redis Caching:** Static data like Topic lists are cached in Redis with automatic cache invalidation during administrative CRUD operations, ensuring high performance.
- **Graceful Fallback:** If Gemini AI is throttled or fails, the application automatically falls back to DeepSeek, then to a pool of high-quality "filler questions" in the database, or finally to global random scavenging.

---

## Core Systems

### Layout & UI Principles
- **Balanced Vertical Centering:** The room page utilizes a viewport-aligned layout where the active interaction area (e.g., the Wager grid) is perfectly centered between the navbar and footer.
- **Symmetric Sizing:** Navbar and footer share identical heights to create a stable, centered frame for game content.
- **Anchored Floating Header:** The `RoomHeader` is absolutely positioned at the top of the content area, keeping it atmospheric and readable without pushing interaction elements out of the vertical center.
- **Fixed-Position Timer:** The `FluidTimer` is fixed to the bottom-right of the viewport, ensuring it's always visible across all device sizes without requiring scrolling.

### Fuzzy Answer Matching
The application uses a robust `validateAnswer` utility (`src/lib/validation.ts`) to provide a fair and forgiving experience:
- **Context-Aware Validation:** Fuzzy matching (partial word matching) is strictly applied to open-ended `text` questions. Multiple-choice and boolean questions require exact matches.
- **Numerical Tolerance:** 
    - **Years:** Strict `+/- 1` tolerance for 4-digit years.
    - **Small Integers:** `+/- 1` tolerance for numbers 0-100.
    - **Large Numbers:** 2% margin of error for non-year values.
- **Range Support:** Handles ranges in correct answers (e.g., "1990-1995") and validates if the user's number falls within it.
- **Partial Name Matching:** For text questions, accepts single significant words (e.g., "Einstein") while filtering out common stop words ("The", "And", "Of", etc.).
- **Normalization:** Strips common punctuation and extra whitespace before comparison.

### Mobile UX & Responsiveness
Designed with a "Mobile First" philosophy:
- **Adaptive Layouts:** Paddings and font sizes scale based on screen width.
- **Mobile Results View:** The desktop results table is replaced by a high-contrast card list on smaller screens for better readability.
- **Touch-Friendly UI:** Large buttons and inputs optimized for mobile interaction.
- **Dynamic Boolean UI:** Automatically switches between **True/False** and **Yes/No** layouts based on question subtype.

### Error Handling (Toast System)
A custom, animated `Toast` component (`src/components/Toast.tsx`) replaces standard `alert()` calls, providing a non-blocking and polished user feedback loop for errors like joining failures or desyncs.

### Atmosphere & Interactions
The application features a unique, immersive visual environment:
- **Interactive Backgrounds:** Three selectable modes (**Synapse**, **Synapse V2**, **Data Stream**) built with optimized HTML5 Canvas.
- **Mouse Interactions:** Deep responsiveness including node orbiting, synaptic bursts on click, and fluid-wake particle turbulence.
- **Atmosphere Controls:** Persistent toggles for switching background modes and completely disabling animations for a focused experience.
- **Automatic Scaling:** Mobile devices automatically receive a reduced particle density (~45% fewer nodes) to maintain smooth 60fps performance.

### Accessibility & Shortcuts
Built for speed and power users:
- **Navigation Shortcuts:** Press **Escape** or the **Mouse Back button** from anywhere to navigate to the previous view.
- **Landing Shortcuts:** Press **'J'** to immediately open the Join Game form.
- **In-Game Hotkeys:** 
    - **1-4:** Multiple choice options.
    - **T/F:** True/False questions.
    - **Y/N:** Yes/No questions.
    - **1-9/0:** Wager selection.
- **Focus Rings:** High-visibility focus rings on all interactive elements for standard keyboard navigation.

### Monitoring & Performance
Integrated with Vercel's observability suite for production-grade insights:
- **Vercel Analytics:** Real-time tracking of visitor traffic and engagement patterns.
- **Vercel Speed Insights:** Detailed Core Web Vitals monitoring to ensure optimal performance across all device types.
- **Auto-Initialization:** Monitoring components are integrated directly into the `RootLayout` for comprehensive session coverage.

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
Managed via consolidated migrations in `supabase/migrations/`:
- `0001_schema.sql`: Table definitions for `topics` and `questions` with strict RLS policies (authenticated admins only for modifications).
- `0002_data.sql`: Initial seed data including core topics and a large pool of high-quality questions.
- `0003_indexes.sql`: Strategic indexing on `topic`, `name`, `created_at`, and `text` for high-performance query execution.

### Project Structure
The codebase follows a modular architecture for improved maintainability:
- `src/app/`: Next.js App Router pages and layouts.
- `src/components/home/`: Components for the landing page experience (Topic selection, Join Game).
- `src/components/room/`: Components for the real-time game loop (Lobby, Wagers, Question, Results).
- `src/components/admin/`: Tools for managing the trivia domain.
- `src/components/shared/`: Globally reused UI elements (Toast, Background).
- `src/lib/`: Core logic, including AI fallback, server actions, and fuzzy validation.

### AI Generation Strategy
The application employs a resilient multi-model approach for generating trivia questions and custom topics:
1. **Primary Provider:** Google Gemini (models like `gemini-2.0-flash`).
2. **Fallback Provider:** DeepSeek (`deepseek-chat`). If Gemini fails due to rate limits or errors, the system automatically falls back to DeepSeek to ensure uninterrupted gameplay.
3. **Question Types:** Supports `multiple_choice`, `boolean`, `boolean_yes_no`, and `text`.
4. **Mandatory Custom Topics:** If a user requests a custom topic, the system MUST generate it via AI. If AI generation fails, an error is shown instead of falling back to random database questions, ensuring topical integrity.
5. **High-Difficulty Enforcement:** AI is strictly tuned to generate "Expert Level" questions (Difficulty 9/10), avoiding common knowledge and focusing on obscure details, historical nuances, and complex relationships.
6. **Cryptic Summaries:** Question summaries (round titles) are generated to be enigmatic and atmospheric without revealing the answer (e.g., using "Seine City Secrets" instead of "Capital of France").
7. **Personality-Driven Roasts:** The end-game roast engine assigns distinct personas (e.g., *Gordon Ramsay*, *Sarcastic Butler*) to provide unique, witty, and varied commentary for each player.

### Testing Practices
- **TDD:** New features should include a test case in `tests/`.
- **Validation Testing:** Use `tests/validation.test.ts` for any updates to answer verification logic.
- **Next.js 15 Compatibility:** Mock `React.use()` for unwrapping dynamic `params` in tests.
