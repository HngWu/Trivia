# Atmosphere, Performance & Accessibility Specification (2026-05-10)

## Overview
This specification details the transition from a static visual identity to a highly interactive, performance-optimized, and accessible trivia platform. The focus is on immersive atmosphere controls and high-speed data handling.

## 1. Atmosphere System
The application now supports multiple interactive canvas environments:
- **Synapse (Core):** Floating nodes with orbital mouse attraction.
- **Synapse V2:** High-density particle network with instant mouse node connections.
- **Data Stream:** Fluid-wake particle simulation with vortex turbulence.
- **Atmosphere Controls:** 
    - Mode Cycler in navigation bars.
    - Global Play/Pause toggle (👁️/👁️‍🗨️) for full background unmounting to save resources.
    - Automatic density reduction for mobile clients (~45%).

## 2. Performance Engineering
- **Redis Layer:** Implemented caching for `getTopics` with automatic invalidation during CRUD operations.
- **Database Indexing:** Strategic composite indexes on `questions` and `topics` tables for O(log n) retrieval.
- **State Synchronization:** Transitioned to versioned state packets with `requestAnimationFrame` deferral to prevent React cascading render warnings.

## 3. Accessibility & Shortcuts
- **Global Navigation:** `Escape` and `Mouse Back` mapped to standard browser history actions.
- **Power User Flow:** 
    - `J`: Open Join Game from landing.
    - `Enter`: Submit forms (Login, Create, Join, Question Add).
    - `1-4` / `T-F`: Answer hotkeys.
    - `0-9`: Wager hotkeys.
- **Visual Cues:** Standardized `focus:ring` behavior and high-contrast `Lume-Glass` hover states.

## 4. Branding & Visual Design
- **Iconography:** Moved from standard favicon to a custom SVG dark-mode brain-duel icon with integrated app-style background.
- **Design Palette:** Unified on a Charcoal base (`#121212`) with Muted Pearl foreground and Vivid Blue/Gold highlights.
