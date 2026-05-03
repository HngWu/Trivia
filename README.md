# TriviaDuel Clone

A high-stakes, real-time multiplayer trivia application built with Next.js, Gemini AI, Redis, and Supabase.

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%204-38B2AC.svg)

## 🚀 Key Features

- **Real-Time Multiplayer:** Instant synchronization between up to 10 players using Supabase Broadcast and Upstash Redis.
- **AI-Powered Questions:** Dynamic trivia generation via Google Gemini AI based on any topic.
- **Strategic Wagering:** Players pick point weights (1-10) for each round, adding a layer of strategy to the battle.
- **Fuzzy Answer Matching:** Intelligent verification that handles numerical ranges, dates (±1 year), and partial name matches.
- **Modern Dark Refresh:** A sleek, high-contrast UI with glassmorphism effects and smooth animations.
- **Mobile Optimized:** Responsive design with adaptive layouts and mobile-specific results views.
- **Server-Authoritative:** Secure scoring and validation handled via Next.js Server Actions.

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Framer Motion.
- **AI:** Google Gemini SDK.
- **Database:** Supabase (PostgreSQL + RLS).
- **Cache/Sync:** Upstash Redis.
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
