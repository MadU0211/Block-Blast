/**
 * Block Blast - 8x8 grid, place blocks to clear rows/columns.
 * Three blocks at a time, no rotation. Game over when no block fits.
 */

const ROWS = 8;
const COLS = 8;
const CELL_SIZE = 36; // match CSS --cell-size for drag preview

// Block shapes: array of rows, each row is array of 0/1. Fixed orientation.
// Spawn is purely random (no grid-space logic); difficulty increases by favoring larger shapes over time.
const SHAPES = [
  [[1]],                                    // 1x1
  [[1, 1]],                                 // 1x2
  [[1], [1]],                               // 2x1
  [[1, 1], [1, 1]],                         // 2x2
  [[1, 1, 1]],                              // 1x3
  [[1], [1], [1]],                          // 3x1
  [[1, 1, 1, 1]],                           // 1x4
  [[1], [1], [1], [1]],                     // 4x1
  [[1, 1, 1], [1, 0, 0]],                   // L
  [[1, 1, 1], [0, 0, 1]],                   // J
  [[1, 0, 0], [1, 1, 1]],                   // L mirrored
  [[0, 0, 1], [1, 1, 1]],                   // J mirrored
  [[1, 1], [1, 0]],                         // small L
  [[1, 1], [0, 1]],                         // small J
  [[0, 1], [1, 1]],                         // small L other
  [[1, 0], [1, 1]],                         // small J other
  [[1, 1, 1], [0, 1, 0]],                   // T
  [[0, 1, 0], [1, 1, 1]],                   // T down
  [[1, 0], [1, 1], [1, 0]],                 // T left
  [[0, 1], [1, 1], [0, 1]],                 // T right
  [[1, 1, 1], [1, 1, 1]],                   // 3x2
  [[1, 1], [1, 1], [1, 1]],                 // 2x3
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],       // 3x3
];

// Indices of larger shapes (4+ cells) – used to increase difficulty over time
const LARGE_SHAPE_INDICES = [6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22];

const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

let state = {
  grid: [],
  currentBlocks: [],
  score: 0,
  combo: 0,
  streak: 0,
  lastMoveCleared: false,
  gameOver: false,
  selectedBlockIndex: -1,
  draggingBlockIndex: -1,
};

const boardEl = document.getElementById('board');
const boardBlastEl = document.getElementById('board-blast');
const blocksHolderEl = document.getElementById('blocks-holder');
const scoreEl = document.getElementById('score');
const starBlastEl = document.getElementById('star-blast');
const overlayEl = document.getElementById('overlay');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const restartHeaderBtn = document.getElementById('restart-header-btn');
const highScoreEl = document.getElementById('high-score');

const HIGH_SCORE_KEY = 'blockblast-highscore';

function getHighScore() {
  const s = localStorage.getItem(HIGH_SCORE_KEY);
  return s !== null ? parseInt(s, 10) : 0;
}

function setHighScore(value) {
  localStorage.setItem(HIGH_SCORE_KEY, String(value));
}

function initGrid() {
  state.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

// Purely random shape; no grid-space consideration. Slightly harder at score 250, 500, 750, 1000...
function randomShape() {
  const score = state.score;
  const level = Math.floor(score / 250); // 0 at 0–249, 1 at 250–499, 2 at 500–749, etc.
  const largeChance = level * 0.08; // +8% chance per tier (0%, 8%, 16%, 24%...)
  const useLargePool = largeChance > 0 && Math.random() < largeChance;
  const pool = useLargePool ? LARGE_SHAPE_INDICES : [...Array(SHAPES.length).keys()];
  const idx = pool[Math.floor(Math.random() * pool.length)];
  const shape = SHAPES[idx].map(row => [...row]);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { shape, color };
}

function getThreeBlocks() {
  return [randomShape(), randomShape(), randomShape()];
}

function canPlace(shape, color, row, col) {
  const H = shape.length;
  const W = shape[0].length;
  if (row + H > ROWS || col + W > COLS) return false;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (shape[r][c] && state.grid[row + r][col + c]) return false;
    }
  }
  return true;
}

function placeBlock(shape, color, row, col) {
  const H = shape.length;
  const W = shape[0].length;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (shape[r][c]) state.grid[row + r][col + c] = color;
    }
  }
}

function clearLines() {
  const rowsToClear = [];
  const colsToClear = [];
  for (let r = 0; r < ROWS; r++) {
    if (state.grid[r].every(cell => cell !== 0)) rowsToClear.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) {
      if (!state.grid[r][c]) { full = false; break; }
    }
    if (full) colsToClear.push(c);
  }
  const count = rowsToClear.length + colsToClear.length;
  if (count === 0) return { count: 0, rows: [], cols: [] };

  for (const r of rowsToClear) {
    for (let c = 0; c < COLS; c++) state.grid[r][c] = 0;
  }
  for (const c of colsToClear) {
    for (let r = 0; r < ROWS; r++) state.grid[r][c] = 0;
  }

  // Scoring: base per line, combo = 2^count, streak = 20 per streak
  let points = count * 10;
  points += Math.pow(2, count); // combo: 2 to the number of combos
  if (state.streak > 0) points += state.streak * 20;
  state.score += points;
  state.combo = count;
  state.lastMoveCleared = true;
  state.streak++;
  return { count, rows: rowsToClear, cols: colsToClear };
}

function noClearThisMove() {
  state.lastMoveCleared = false;
  state.streak = 0;
  state.combo = 0;
}

function canPlaceAny(blocks) {
  for (const { shape } of blocks) {
    const H = shape.length, W = shape[0].length;
    for (let r = 0; r <= ROWS - H; r++) {
      for (let c = 0; c <= COLS - W; c++) {
        if (canPlace(shape, null, r, c)) return true;
      }
    }
  }
  return false;
}

function tryPlaceBlock(blockIndex, row, col) {
  if (state.gameOver || blockIndex < 0 || blockIndex >= state.currentBlocks.length) return false;
  const { shape, color } = state.currentBlocks[blockIndex];
  if (!canPlace(shape, color, row, col)) return false;

  placeBlock(shape, color, row, col);
  state.score += 5; // 5 points for placing a block
  const linesCleared = clearLines();
  if (linesCleared.count === 0) noClearThisMove();

  state.currentBlocks.splice(blockIndex, 1);
  while (state.currentBlocks.length < 3) state.currentBlocks.push(randomShape());

  if (!canPlaceAny(state.currentBlocks)) {
    state.gameOver = true;
    showGameOver();
  }

  if (linesCleared.count > 0) {
    triggerBoardStarBlast(linesCleared.rows, linesCleared.cols);
    triggerStarBlast();
    scoreEl.classList.remove('bump');
    scoreEl.offsetHeight;
    scoreEl.classList.add('bump');
    setTimeout(() => scoreEl.classList.remove('bump'), 300);
  }
  render();
  updateScores();
  return true;
}

function renderGrid() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
  boardEl.style.gridTemplateRows = `repeat(${ROWS}, var(--cell-size))`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
          cell.dataset.col = c;
      const val = state.grid[r][c];
      if (val) {
        cell.classList.add('filled', val);
      }
      boardEl.appendChild(cell);
    }
  }
}

function renderBlocks() {
  blocksHolderEl.innerHTML = '';
  state.currentBlocks.forEach((block, index) => {
    const opt = document.createElement('div');
    opt.className = 'block-option';
    opt.dataset.blockIndex = index;
    opt.draggable = true;
    const H = block.shape.length, W = block.shape[0].length;
    opt.style.gridTemplateColumns = `repeat(${W}, var(--cell-size))`;
    opt.style.gridTemplateRows = `repeat(${H}, var(--cell-size))`;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (block.shape[r][c]) {
          const cell = document.createElement('div');
          cell.className = 'block-cell ' + block.color;
          // Explicit grid position so shapes with holes (L, T, J) don't get mis-placed
          cell.style.gridRow = String(r + 1);
          cell.style.gridColumn = String(c + 1);
          opt.appendChild(cell);
        }
      }
    }
    blocksHolderEl.appendChild(opt);
  });
}

function render() {
  renderGrid();
  renderBlocks();
  attachBlockListeners();
  attachBoardListeners();
}

function updateScores() {
  scoreEl.textContent = state.score;
  highScoreEl.textContent = getHighScore();
}

function triggerStarBlast() {
  if (!starBlastEl) return;
  starBlastEl.classList.remove('star-blast-active');
  starBlastEl.offsetHeight; // reflow
  starBlastEl.classList.add('star-blast-active');
  setTimeout(() => starBlastEl.classList.remove('star-blast-active'), 600);
}

function triggerBoardStarBlast(rowsCleared, colsCleared) {
  if (!boardBlastEl) return;
  const cellSet = new Set();
  rowsCleared.forEach(r => { for (let c = 0; c < COLS; c++) cellSet.add(`${r},${c}`); });
  colsCleared.forEach(c => { for (let r = 0; r < ROWS; r++) cellSet.add(`${r},${c}`); });
  boardBlastEl.innerHTML = '';
  boardBlastEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
  boardBlastEl.style.gridTemplateRows = `repeat(${ROWS}, var(--cell-size))`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'board-blast-cell';
      if (cellSet.has(`${r},${c}`)) {
        const star = document.createElement('span');
        star.className = 'board-blast-star';
        star.textContent = '★';
        cell.appendChild(star);
        cell.classList.add('board-blast-cell-active');
      }
      boardBlastEl.appendChild(cell);
    }
  }
  boardBlastEl.classList.add('board-blast-visible');
  setTimeout(() => {
    boardBlastEl.classList.remove('board-blast-visible');
    boardBlastEl.innerHTML = '';
  }, 650);
}

function showGameOver() {
  const best = getHighScore();
  if (state.score > best) {
    setHighScore(state.score);
    highScoreEl.textContent = state.score;
  }
  overlayEl.classList.remove('hidden');
  document.getElementById('overlay-title').textContent = 'Game Over';
  document.getElementById('overlay-message').textContent = "No space left for any block!";
  finalScoreEl.textContent = state.score;
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

function clearDragPreview() {
  boardEl.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('drag-over', 'drag-preview', 'drag-preview-invalid');
  });
}

function getCellFromPoint(clientX, clientY) {
  const rect = boardEl.getBoundingClientRect();
  const cellW = rect.width / COLS;
  const cellH = rect.height / ROWS;
  const col = Math.floor((clientX - rect.left) / cellW);
  const row = Math.floor((clientY - rect.top) / cellH);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  return { row, col };
}

function setDragPreview(row, col, valid, color) {
  const index = state.draggingBlockIndex;
  if (index < 0 || index >= state.currentBlocks.length) return;
  const { shape } = state.currentBlocks[index];
  const H = shape.length, W = shape[0].length;
  const baseCls = valid ? 'drag-preview' : 'drag-preview-invalid';
  for (let dr = 0; dr < H; dr++) {
    for (let dc = 0; dc < W; dc++) {
      if (shape[dr][dc]) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          const cell = boardEl.children[r * COLS + c];
          if (cell) {
            cell.classList.add(baseCls);
            if (valid && color) cell.classList.add(color);
          }
        }
      }
    }
  }
}

function attachBlockListeners() {
  document.querySelectorAll('.block-option').forEach(opt => {
    const index = parseInt(opt.dataset.blockIndex, 10);
    opt.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      e.dataTransfer.effectAllowed = 'move';
      state.draggingBlockIndex = index;
      opt.classList.add('dragging');
    });
    opt.addEventListener('dragend', () => {
      clearDragPreview();
      state.draggingBlockIndex = -1;
      opt.classList.remove('dragging');
    });
    opt.addEventListener('click', () => {
      document.querySelectorAll('.block-option').forEach(o => o.classList.remove('selected'));
      state.selectedBlockIndex = index;
      opt.classList.add('selected');
    });
  });
}

function attachBoardListeners() {
  // Cursor-based dragover/drop so preview sits right under the block
  boardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const pos = getCellFromPoint(e.clientX, e.clientY);
    clearDragPreview();
    if (pos && state.draggingBlockIndex >= 0 && state.currentBlocks[state.draggingBlockIndex]) {
      const block = state.currentBlocks[state.draggingBlockIndex];
      const fits = canPlace(block.shape, block.color, pos.row, pos.col);
      setDragPreview(pos.row, pos.col, fits, block.color);
    }
  });

  boardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const pos = getCellFromPoint(e.clientX, e.clientY);
    clearDragPreview();
    const index = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(index)) return;
    const block = state.currentBlocks[index];
    if (!block) return;
    if (pos) {
      if (!tryPlaceBlock(index, pos.row, pos.col)) {
        const cell = boardEl.children[pos.row * COLS + pos.col];
        if (cell) {
          cell.classList.add('invalid');
          setTimeout(() => cell.classList.remove('invalid'), 300);
        }
      }
    }
  });

  boardEl.querySelectorAll('.cell').forEach(cell => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    cell.addEventListener('click', () => {
      if (state.selectedBlockIndex < 0) return;
      if (tryPlaceBlock(state.selectedBlockIndex, r, c)) {
        state.selectedBlockIndex = -1;
        document.querySelectorAll('.block-option').forEach(o => o.classList.remove('selected'));
      }
    });
  });
}

boardEl.addEventListener('dragleave', (e) => {
  if (!boardEl.contains(e.relatedTarget)) clearDragPreview();
});

function doRestart() {
  initGrid();
  state.currentBlocks = getThreeBlocks();
  state.score = 0;
  state.combo = 0;
  state.streak = 0;
  state.lastMoveCleared = false;
  state.gameOver = false;
  state.selectedBlockIndex = -1;
  state.draggingBlockIndex = -1;
  hideOverlay();
  updateScores();
  render();
}

restartBtn.addEventListener('click', doRestart);
restartHeaderBtn.addEventListener('click', doRestart);

// Init
initGrid();
state.currentBlocks = getThreeBlocks();
updateScores();
render();
