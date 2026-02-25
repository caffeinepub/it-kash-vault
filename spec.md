# Specification

## Summary
**Goal:** Add a "67 Clicker" game to the arcade platform, themed around the "six seven" meme.

**Planned changes:**
- Create a canvas-based `SixSevenGame.tsx` component in `frontend/src/components/games/` with a large clickable "67" meme character in the center
- Each click increments the score, triggers a floating "67!" text effect with flash/shake animation, and advances a combo multiplier for rapid clicks
- Combo multiplier resets after ~1 second of inactivity; current score and best score (persisted in localStorage) are displayed prominently
- Character shows a pulsing idle animation when not being clicked
- Game uses the platform's dark neon arcade theme (near-black background, neon colors, Orbitron typography, neon glow effects)
- Register the game in `GamePage.tsx` so navigating to `/game/67-clicker` renders `SixSevenGame` and increments the play count
- Add the game to `seedGames.ts` with title "67 Clicker", category "Clicker", a short meme-referencing description, and the thumbnail filename

**User-visible outcome:** Users can find and play the "67 Clicker" game from the homepage game library, clicking the meme character to rack up points with combos and compete against their own best score.
