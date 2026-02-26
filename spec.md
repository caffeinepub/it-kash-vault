# Specification

## Summary
**Goal:** Rewrite the Retro Bowl game component to more faithfully replicate the look, feel, and mechanics of the original Retro Bowl mobile game.

**Planned changes:**
- Render the field top-down with a bright green surface, white yard lines, hash marks, and labeled end zones
- Add bold/blocky retro-style player sprites with distinct team colors for each side
- Add a HUD bar displaying score (home vs. away), quarter, time remaining, down & distance, and current yard line
- Show receiver routes as dotted/dashed lines on the field before the snap
- Implement tap/click to select a receiver and a second tap/click to throw with a leading-pass arc
- Auto-scramble the QB if the player does not throw in time
- Implement run plays where the player steers the ball carrier left/right via clicks/taps
- Add AI defenders that chase the ball carrier and attempt tackles and interceptions
- Enforce full football rules: 4 downs for 10 yards, touchdown (6 pts) + extra point (1 pt), field goal (3 pts), safety (2 pts), punt, and turnover on downs
- Implement CPU offense with AI-controlled QB decisions
- Add a play-calling screen with Pass and Run options before each player offensive play
- Add tackle/collision animations when the ball carrier is brought down
- Add a halftime screen between Q2 and Q3
- Add a final score screen with win/loss result and a "Play Again" button
- Use Chakra Petch or Exo 2 typography for all HUD and UI text

**User-visible outcome:** Players experience a significantly improved Retro Bowl game that closely mirrors the original, with proper football mechanics, animated gameplay, AI opponents, and a complete game flow from play-calling through halftime to final score.
