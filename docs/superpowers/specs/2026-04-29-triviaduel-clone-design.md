# TriviaDuel Clone - Design Specification

## Overview
A full-stack web application replicating the core mechanics of "TriviaDuel.com". It allows up to 10 players to join a room, wager points on question summaries, and answer a mix of AI-generated or pre-defined questions. The application ensures competitive integrity by using a server-authoritative state and hiding answers from clients until the reveal phase.

## Game Mechanics & Flow
- **Lobby & Initialization**: 
  - Players join using a room code and a guest nickname (no mandatory accounts).
  - The Room Leader configures the game. For a "Custom Topic", the server queries the Gemini AI to generate 10 questions (Text input, True/False, Multiple choice).
- **Wager Phase**:
  - The summary of the current question is shown.
  - Players must assign a point weight (1 to 10) to the question.
  - Each point weight can only be used *once per game*.
- **Question Phase**:
  - The full question is revealed. The correct answer is **not** sent to the client to prevent cheating via network inspection.
  - Players submit their answers securely to the server.
- **Results Phase**:
  - Once all players answer or time is up, the server broadcasts the correct answer, who answered correctly, and the updated scores.
- **Persistent UI**:
  - Top navigation bar displays the current Leaderboard throughout the game.
  - Left menu contains a "Leave Game" logo/button.
  - Dark mode by default, with a toggle for light mode.

## Architecture & Tech Stack
- **Frontend & Backend**: Next.js (App Router) with React.
- **Styling**: Tailwind CSS.
- **Deployment**: Vercel.
- **Database & Realtime**: Supabase (PostgreSQL + Realtime Subscriptions).
- **Security & Anti-Cheat**: 
  - Next.js API Routes / Server Actions manage all game logic.
  - Supabase Row Level Security (RLS) ensures players cannot query the `questions` or `answers` tables to see correct answers or other players' wagers prematurely.

## Data Models (Supabase)
- **`rooms`**: `id`, `code`, `status` (waiting, wagering, answering, results, finished), `leader_id`, `current_question_index`, `topic`.
- **`players`**: `id`, `room_id`, `name`, `score`, `available_weights` (integer array), `is_leader` (boolean).
- **`questions`**: `id`, `room_id`, `summary`, `text`, `type` (text, boolean, multiple_choice), `options` (JSON array), `correct_answer` (hidden from clients).
- **`answers`**: `id`, `question_id`, `player_id`, `wager` (1-10), `submitted_answer`, `is_correct` (boolean).

## Error Handling & Edge Cases
- **Disconnections**: Players can rejoin using their nickname and room code (handled by matching session/cookies).
- **Late Joiners**: Not permitted once the game transitions from the "waiting" status.
- **AI Failure**: If Gemini fails to generate questions, the leader is notified in the lobby and can retry.
