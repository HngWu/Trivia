# Design: Update Room Loading States and Join Modal

## Goal
Improve visual aesthetics and user feedback during loading and joining states by removing heavy backgrounds, ensuring content is centered, and implementing subtle glassmorphism.

## Changes

### 1. Join Modal
*   **Background:** Remove `bg-background/80`, use `bg-background/20` (or similar) to allow visibility of the `DynamicBackground`.
*   **Backdrop:** Retain `backdrop-blur-3xl` for subtle glassmorphism effect.
*   **Layout:** Keep centered and responsive.

### 2. General Loading States
*   **Remove Opaque Overlays:** In `isLoading` and room transition overlays, remove solid or heavy opaque backgrounds (`bg-background`).
*   **Centering:** Ensure content is perfectly centered within the viewport.
*   **Visuals:** Use high-contrast foreground elements against the underlying dynamic background.

## Verification
*   Verify that `DynamicBackground` is visible behind the join modal.
*   Check transition overlay during room state changes for transparency.
*   Confirm loading text/spinner is centered and readable on all backgrounds.
