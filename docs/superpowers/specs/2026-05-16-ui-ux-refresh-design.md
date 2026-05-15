# UI/UX Refresh Specification - TriviaDuel Clone

## Overview
This specification details the requested UI/UX improvements to the TriviaDuel application, focusing on atmospheric consistency across loading/joining states, layout centering, mobile navigation, and answer-page readability.

## 1. Atmospheric Consistency (Loading & Joining)
- **Problem:** Loading and nickname-entry screens show a flat background instead of the application's immersive animated backgrounds.
- **Solution:** 
    - Ensure the `DynamicBackground` (which is in `RootLayout`) is not obstructed.
    - The `isJoining` modal and `isLoading` states in `src/app/room/[code]/page.tsx` will be audited to ensure they do not have a hard-coded opaque background. We will use a `backdrop-blur` and semi-transparent background to allow the `DynamicBackground` to show through while maintaining text legibility.

## 2. Vertical Centering of Wager Grid
- **Problem:** Wager options are not perfectly centered vertically on larger screens.
- **Solution:** 
    - Adjust `src/components/room/WagerView.tsx` container to use a flex layout with `justify-center` and `min-h-[60vh]`. 
    - This ensures that regardless of the device height, the wager options maintain a balanced visual center.

## 3. Mobile Leaderboard Navigation
- **Problem:** Users cannot scroll horizontally to see the entire leaderboard in the navbar on mobile devices.
- **Solution:** 
    - Modify `src/components/room/RoomNav.tsx` leaderboard container.
    - Remove fixed sizing constraints and apply `flex-nowrap` to ensure items remain in a single row.
    - Ensure `overflow-x-auto` is utilized with smooth momentum scrolling (`-webkit-overflow-scrolling: touch`).

## 4. Answer Page Readability (Mobile/Desktop)
- **Problem:** Padding and font sizing in `QuestionView` is inconsistent across screen sizes.
- **Solution:** 
    - Update `QuestionView.tsx` text sizes for questions and answer buttons to be fluid.
    - Tighten padding on mobile views (`p-4 sm:p-12`) to reclaim screen real estate for the question text.
    - Maintain a minimum readability font size for answer buttons to ensure touch-friendly interaction.

## 5. Implementation Plan
- **Phase 1:** Update `src/app/room/[code]/page.tsx` to ensure `DynamicBackground` is visible during states.
- **Phase 2:** Update `src/components/room/WagerView.tsx` layout classes.
- **Phase 3:** Update `src/components/room/RoomNav.tsx` navigation container.
- **Phase 4:** Update `src/components/room/QuestionView.tsx` font and padding utility classes.
- **Verification:** Test on desktop and mobile viewports to ensure desired behavior.
