# TriviaDuel Clone

A high-stakes, real-time multiplayer trivia application built with Next.js, Gemini AI, Redis, and Supabase.

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%204-38B2AC.svg)

## 🚀 Key Features

- **Real-Time Multiplayer:** Instant synchronization between up to 10 players using Supabase Broadcast and Upstash Redis.
- **Resilient AI Generation:** Dynamic trivia generation with a multi-model fallback strategy (Google Gemini → DeepSeek) for maximum reliability.
- **Strategic Wagering:** Players pick point weights (1-10) for each round, adding a layer of strategy to the game.
- **Fuzzy Answer Matching:** Intelligent verification that handles numerical ranges, dates (±1 year), and partial name matches.
- **Liquidglass UI System:** A premium, Apple-inspired aesthetic featuring deep blurs, muted contrast, and smooth fluid animations.
- **Mobile-First Design:** Optimized for all devices with zero-zoom inputs, generous touch targets, and adaptive typography.
- **Server-Authoritative:** Secure scoring and validation handled via authoritative Next.js Server Actions.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4.
- **AI Integration:** Google Gemini SDK & DeepSeek API.
- **Infrastructure:** Upstash Redis (Active State) & Supabase (Persistence + RLS).
- **Testing:** Jest & React Testing Library.

## 🏁 Getting Started

### Prerequisites

Ensure you have the following environment variables in your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Testing

```bash
npx jest
```

## 📖 Documentation

For detailed information on architecture, conventions, and systems:

- [GEMINI.md](./GEMINI.md) - Project instructions and core system details.
- [docs/superpowers/specs/](./docs/superpowers/specs/) - Architectural design specifications.

## 📄 License

This project is licensed under the MIT License.
