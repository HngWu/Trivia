# TriviaDuel Clone

A high-stakes, real-time multiplayer trivia application built with Next.js, Gemini AI, Redis, and Supabase.

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%204-38B2AC.svg)

## 🚀 Key Features

- **Real-Time Multiplayer:** Instant synchronization between up to 10 players using Supabase Broadcast and Upstash Redis.
- **Resilient AI Generation:** Dynamic trivia generation with a multi-model fallback strategy (Google Gemini 2.0 Flash → DeepSeek) for maximum reliability.
- **Interactive Atmospheric Backgrounds:** Choice of three dynamic canvas backgrounds (**Synapse**, **Synapse V2**, **Data Stream**) with deep mouse interactions (orbiting nodes, fluid wakes).
- **Lume-Glass UI System:** A premium, Apple-inspired aesthetic featuring deep blurs, muted charcoal theme (`#121212`), and interactive "Lume" hover effects.
- **AI-Powered (Local) Roasts:** Instantly generated witty burns at the end of matches based on player performance and wagering strategy.
- **Accessibility & Shortcuts:** Built for power users with global shortcuts (**Esc** to go back, **'J'** to join, **1-4/T-F** to answer) and full keyboard navigation support.
- **Performance Optimized:** Redis-based caching for topic retrieval and strategic database indexing for near-instant query responses.
- **Mobile-First & Adaptive:** Automatically reduces animation density on mobile devices for buttery-smooth 60fps gameplay on all hardware.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4.
- **AI Integration:** Google Gemini SDK & DeepSeek API.
- **Infrastructure:** Upstash Redis (Active State & Caching) & Supabase (Persistence + RLS).
- **Animation:** High-performance HTML5 Canvas & custom CSS transitions.
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
