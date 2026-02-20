# Block Blast

A browser-based Block Blast puzzle game. Clear full rows and columns on an 8×8 grid by placing blocks. You always have three block shapes; place one and a new one appears. Game over when no block can be placed.

## How to play

- **Drag & drop:** Drag a block from the bottom panel onto the grid and release to place it (top-left of the block snaps to the cell you drop on).
- **Click to place:** Click a block to select it (it highlights), then click a cell on the board to place it with its top-left at that cell.
- **Rules:** Blocks cannot be rotated. Clear full rows or full columns to remove them and score. Combos (multiple lines in one move) and streaks (clearing on consecutive moves) give bonus points.

## Run locally

Open `index.html` in a browser, or use a local server:

```bash
npx serve .
```

Then open the URL shown (e.g. http://localhost:3000).
