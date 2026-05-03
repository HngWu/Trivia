# Specification: Mobile UX and Error Handling

## Status: Implemented
Date: 2026-05-02

## Overview
This specification details the enhancements made to the mobile user experience and the implementation of a robust, non-blocking error handling system using custom toasts.

## Mobile UX Optimizations

### Adaptive Scaling
- **Paddings:** Container paddings scale from `p-4` (mobile) to `p-12` (desktop).
- **Typography:** Headlines scale from `text-4xl` (mobile) to `text-7xl/8xl` (desktop) to ensure visual impact on all devices.
- **Inputs & Buttons:** Interaction elements maintain high tap-target sizes (min 48px height) even on small screens.

### Mobile-Specific Views
- **Results Round Summary:** On screens smaller than 640px (`sm`), the desktop `<table>` is replaced with an interactive list of cards (`src/app/room/[code]/page.tsx`). 
- Each card shows the player's name, their submitted answer, their wager, and a high-contrast correctness indicator.

## Error Handling System

### Toast Component (`src/components/Toast.tsx`)
- **Visuals:** A floating, glassmorphic toast with framer-motion animations (slide-in/fade-out).
- **Positioning:** Fixed top-center to ensure visibility without obstructing core game buttons.
- **Behavior:** Auto-dismisses after 4 seconds.
- **Trigger:** Replaces standard `alert()` in all game flows (joining, room creation, desyncs).

## Verification
- **Responsive Testing:** Layouts verified on standard mobile viewports (375px to 768px).
- **Unit Tests:** Toast component rendering logic verified.
