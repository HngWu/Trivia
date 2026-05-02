# TriviaDuel: Modern Dark Refresh Specification

**Status:** Approved
**Topic:** UI/UX Overhaul & Functional Enhancements
**Date:** 2026-05-02

## 1. Visual Design

### 1.1 Color Palette
The application will use a fixed dark theme with the following HSL values:
- **Background:** `hsl(217.2 32.6% 17.5%)`
- **Primary/Secondary Text:** `hsl(215 20.2% 65.1%)`
- **Accents/Primary Action:** `white`
- **Input/Glass Background:** `rgba(255, 255, 255, 0.05)`

### 1.2 Layout Updates
- **Theme Locking:** Remove `ThemeProvider` and `ThemeToggle`.
- **Typography:** Force clean sans-serif (Geist/Inter).

## 2. Redesigned Landing Page (`/`)

### 2.1 Structure (Top to Bottom)
1.  **Header:** Title and Subtitle.
2.  **Join Section:** A centered "Join Room" button that reveals a compact `h-10` input for the Room Code.
3.  **Category Carousel:** A horizontal scrollable list of category cards (History, Science, Pop Culture, etc.).
4.  **Selected View (Dynamic):** Triggered when a category is clicked. Displays:
    - **Description:** A simple summary of the topic.
    - **Example Question:** A static or pre-defined preview question.
    - **Onboarding:** "Your Name" input (`h-10`) and "Create Battle" button.

## 3. Room Management & Onboarding

### 3.1 Invite Links
- After creating a room, display a "Copy Invite Link" button in the Lobby.
- The link format will be: `https://<domain>/room/<CODE>`.

### 3.2 Smart Join Logic
When a user accesses `/room/[code]`:
1.  **Check Identity:** Check `localStorage` for `player_name`.
2.  **Auto-Join:** If found, automatically trigger the `joinRoom` action.
3.  **Prompt:** If NOT found, display a full-screen name input prompt before allowing entry to the lobby.

## 4. Technical Tasks
- Update `src/app/globals.css` with new color variables.
- Remove theme components.
- Refactor `Home` component (`src/app/page.tsx`) for new layout.
- Update `RoomPage` (`src/app/room/[code]/page.tsx`) to handle direct link joins and copy functionality.
