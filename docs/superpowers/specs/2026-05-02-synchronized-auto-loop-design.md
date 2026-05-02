# Synchronized Automatic Game Loop Design

This document outlines the architecture for a synchronized, fully automatic game loop for the TriviaDuel application.

## Goal
To ensure all players move through the game phases (Wager, Question, Results) collectively, preventing individual progress from revealing questions or results early. Transitions between phases should be automatic based on player actions and fixed delays.

## Architecture

### Phase Flow
1. **Lobby (`waiting`)**: Initial state. Leader triggers the match.  
2. **Wager Phase (`wager`)**:
   - Players select their wager (1-10).
   - UI: Players who have wagered see "Waiting for others...".
   - **Transition**: When all players have submitted a wager, the room status updates to `question`.
3. **Question Phase (`question`)**:
   - Question and answer options are revealed to all players simultaneously.
   - UI: Players who have answered see "Response Authorized. Validating...".
   - **Transition**: When all players have submitted an answer, the room status updates to `results`.
4. **Results Phase (`results`)**:
   - Results (correct/wrong, correct answer, score deltas) are shown to all.
   - **Transition**: After a 7-second delay, the room automatically transitions to the next round's `wager` phase or the `final` leaderboard.
5. **Final Phase (`final`)**:
   - Final scores and rankings are displayed.

### Data Model & Synchronization
- **Redis**: Stores active room state (`status`, `current_question_index`) and player answers.
- **Supabase Broadcast**: Used to notify all clients when the room state changes.
- **Leader Responsibility**: The room leader's client is responsible for monitoring the collective state and triggering the server-side status updates to ensure consistency.

### Component Logic (`RoomPage.tsx`)
- `checkCollectiveTransitions`: An effect that runs on the leader's client.
  - Monitors `allRoomAnswers` and `players` count.
  - Triggers `updateRoomStatus` when completion criteria are met for `wager` and `question` phases.
- `AutoNextRound`: An effect or timeout in the `results` phase that triggers `handleNextRound` after 7 seconds.

### Server Actions (`actions.ts`)
- `updateRoomStatus`: Updates the room state in Redis and increments the question index when moving to a new round.
- `submitWager` / `submitAnswer`: Persist player input to Redis.

## Testing Strategy
- **Unit Tests**: Verify `checkCollectiveTransitions` logic with mocked player/answer states.
- **Integration Tests**: Simulate multiple players and verify that the question is only revealed after all wagers are in.
- **Manual Testing**: Open multiple browser windows to ensure synchronization across clients.
