# Specification

## Summary
**Goal:** Replace the programmatically drawn drum/stick figure in the TungTungGame clicker with the uploaded Tung Tung Tung wooden stick character image.

**Planned changes:**
- Save the cropped/resized character image as a static asset at `frontend/public/assets/generated/tung-character.dim_300x300.png`
- Update `TungTungGame.tsx` to render the character image on the canvas instead of the previously drawn figure
- Apply idle pulse/scale animation to the character image
- Retain click-triggered TUNG! flash/shake animation and score increment on the image
- Keep combo multiplier and best score mechanics intact

**User-visible outcome:** The TungTungGame clicker now displays the Tung Tung Tung wooden stick character as the central clickable target, with all existing hit effects and scoring mechanics working as before.
