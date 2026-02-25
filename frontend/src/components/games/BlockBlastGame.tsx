import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Piece {
  cells: [number, number][]; // [row, col] offsets
  color: string;
  glowColor: string;
}

interface PlacedPiece {
  piece: Piece;
  trayIndex: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID_SIZE = 8;
const CELL_SIZE = 52;
const GRID_PADDING = 4;
const CANVAS_W = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;
const CANVAS_H = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;

const NEON_PIECES: Piece[] = [
  // 1x1
  { cells: [[0, 0]], color: '#00ffcc', glowColor: '#00ffcc' },
  // 1x2
  { cells: [[0, 0], [0, 1]], color: '#ff2d78', glowColor: '#ff2d78' },
  // 2x1
  { cells: [[0, 0], [1, 0]], color: '#ffe600', glowColor: '#ffe600' },
  // 1x3
  { cells: [[0, 0], [0, 1], [0, 2]], color: '#00cfff', glowColor: '#00cfff' },
  // 3x1
  { cells: [[0, 0], [1, 0], [2, 0]], color: '#b400ff', glowColor: '#b400ff' },
  // 1x4
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: '#ff2d78', glowColor: '#ff2d78' },
  // 4x1
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#00ffcc', glowColor: '#00ffcc' },
  // 2x2
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: '#ffe600', glowColor: '#ffe600' },
  // L-shape
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], color: '#00cfff', glowColor: '#00cfff' },
  // J-shape
  { cells: [[0, 1], [1, 1], [2, 0], [2, 1]], color: '#b400ff', glowColor: '#b400ff' },
  // T-shape
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: '#ff2d78', glowColor: '#ff2d78' },
  // S-shape
  { cells: [[0, 1], [0, 2], [1, 0], [1, 1]], color: '#00ffcc', glowColor: '#00ffcc' },
  // Z-shape
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], color: '#ffe600', glowColor: '#ffe600' },
  // 3x3
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], color: '#ff2d78', glowColor: '#ff2d78' },
  // 2x3
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], color: '#00cfff', glowColor: '#00cfff' },
  // Corner
  { cells: [[0,0],[1,0],[1,1]], color: '#b400ff', glowColor: '#b400ff' },
  // Corner 2
  { cells: [[0,0],[0,1],[1,0]], color: '#ffe600', glowColor: '#ffe600' },
  // Plus
  { cells: [[0,1],[1,0],[1,1],[1,2],[2,1]], color: '#00ffcc', glowColor: '#00ffcc' },
];

function randomPiece(): Piece {
  return NEON_PIECES[Math.floor(Math.random() * NEON_PIECES.length)];
}

function createEmptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function canPlace(grid: (string | null)[][], piece: Piece, row: number, col: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}

function placePiece(grid: (string | null)[][], piece: Piece, row: number, col: number): (string | null)[][] {
  const newGrid = grid.map((r) => [...r]);
  for (const [dr, dc] of piece.cells) {
    newGrid[row + dr][col + dc] = piece.color;
  }
  return newGrid;
}

function clearLines(grid: (string | null)[][]): { newGrid: (string | null)[][]; cleared: number } {
  const newGrid = grid.map((r) => [...r]);
  let cleared = 0;

  // Find full rows
  const fullRows: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (newGrid[r].every((c) => c !== null)) fullRows.push(r);
  }

  // Find full cols
  const fullCols: number[] = [];
  for (let c = 0; c < GRID_SIZE; c++) {
    if (newGrid.every((row) => row[c] !== null)) fullCols.push(c);
  }

  // Clear rows
  for (const r of fullRows) {
    for (let c = 0; c < GRID_SIZE; c++) newGrid[r][c] = null;
    cleared++;
  }

  // Clear cols
  for (const c of fullCols) {
    for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = null;
    cleared++;
  }

  return { newGrid, cleared };
}

function hasAnyValidPlacement(grid: (string | null)[][], tray: (Piece | null)[]): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(grid, piece, r, c)) return true;
      }
    }
  }
  return false;
}

// ─── Tray piece mini-canvas renderer ─────────────────────────────────────────
function PieceTile({
  piece,
  selected,
  onClick,
  disabled,
}: {
  piece: Piece | null;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const MINI_CELL = 14;
  const PAD = 6;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !piece) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxR = Math.max(...piece.cells.map(([r]) => r));
    const maxC = Math.max(...piece.cells.map(([, c]) => c));
    const w = (maxC + 1) * MINI_CELL + PAD * 2;
    const h = (maxR + 1) * MINI_CELL + PAD * 2;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    for (const [dr, dc] of piece.cells) {
      const x = PAD + dc * MINI_CELL;
      const y = PAD + dr * MINI_CELL;
      ctx.shadowBlur = selected ? 14 : 6;
      ctx.shadowColor = piece.glowColor;
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, MINI_CELL - 2, MINI_CELL - 2, 3);
      ctx.fill();
      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, MINI_CELL - 8, 4, 2);
      ctx.fill();
    }
  }, [piece, selected]);

  if (!piece) {
    return <div className="w-20 h-20 rounded-xl border border-white/5 bg-black/20" />;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center w-20 h-20 rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_18px_rgba(0,255,204,0.5)]'
          : 'border-white/20 bg-black/30 hover:border-white/40 hover:bg-white/5'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
    </button>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────
export default function BlockBlastGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game state (refs for canvas loop)
  const gridRef = useRef<(string | null)[][]>(createEmptyGrid());
  const trayRef = useRef<(Piece | null)[]>([randomPiece(), randomPiece(), randomPiece()]);
  const selectedRef = useRef<number | null>(null);
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(parseInt(localStorage.getItem('blockblast-best') || '0', 10));
  const flashRowsRef = useRef<Set<number>>(new Set());
  const flashColsRef = useRef<Set<number>>(new Set());
  const flashTimerRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  // React state for UI
  const [tray, setTray] = useState<(Piece | null)[]>([randomPiece(), randomPiece(), randomPiece()]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(bestScoreRef.current);
  const [gameOver, setGameOver] = useState(false);
  const [lastCleared, setLastCleared] = useState(0);

  // Sync refs with state
  useEffect(() => { trayRef.current = tray; }, [tray]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // ─── Canvas draw ────────────────────────────────────────────────────────────
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = CANVAS_W;
    const H = CANVAS_H;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#050010';
    ctx.fillRect(0, 0, W, H);

    const grid = gridRef.current;
    const hover = hoverCellRef.current;
    const selIdx = selectedRef.current;
    const selPiece = selIdx !== null ? trayRef.current[selIdx] : null;

    // Determine preview cells
    const previewCells = new Set<string>();
    const invalidPreview = hover && selPiece && !canPlace(grid, selPiece, hover.row, hover.col);
    if (hover && selPiece && !invalidPreview) {
      for (const [dr, dc] of selPiece.cells) {
        previewCells.add(`${hover.row + dr},${hover.col + dc}`);
      }
    }

    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = GRID_PADDING + c * CELL_SIZE;
        const y = GRID_PADDING + r * CELL_SIZE;
        const cellColor = grid[r][c];
        const isFlashRow = flashRowsRef.current.has(r);
        const isFlashCol = flashColsRef.current.has(c);
        const isFlash = isFlashRow || isFlashCol;
        const isPreview = previewCells.has(`${r},${c}`);

        // Cell background
        if (cellColor) {
          if (isFlash) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.shadowBlur = 12;
            ctx.shadowColor = cellColor;
            ctx.fillStyle = cellColor;
          }
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.fill();
          // Inner highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, CELL_SIZE - 16, 8, 3);
          ctx.fill();
        } else if (isPreview) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = selPiece!.glowColor;
          ctx.fillStyle = selPiece!.color + '55';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = selPiece!.color + 'aa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.stroke();
        } else {
          // Empty cell
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.stroke();
        }
      }
    }

    // Invalid placement indicator
    if (hover && selPiece && invalidPreview) {
      for (const [dr, dc] of selPiece.cells) {
        const r = hover.row + dr;
        const c = hover.col + dc;
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
        const x = GRID_PADDING + c * CELL_SIZE;
        const y = GRID_PADDING + r * CELL_SIZE;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff2d78';
        ctx.fillStyle = 'rgba(255,45,120,0.25)';
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.shadowBlur = 0;
  }, []);

  // ─── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      if (flashTimerRef.current > 0) {
        flashTimerRef.current = Math.max(0, flashTimerRef.current - dt);
        if (flashTimerRef.current === 0) {
          flashRowsRef.current = new Set();
          flashColsRef.current = new Set();
        }
      }

      drawGrid();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawGrid]);

  // ─── Mouse/touch handlers ────────────────────────────────────────────────────
  const getCellFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = (clientX - rect.left) * scaleX - GRID_PADDING;
    const y = (clientY - rect.top) * scaleY - GRID_PADDING;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    hoverCellRef.current = getCellFromEvent(e);
  }, [getCellFromEvent]);

  const handleMouseLeave = useCallback(() => {
    hoverCellRef.current = null;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameOver) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const selIdx = selectedRef.current;
    if (selIdx === null) return;
    const piece = trayRef.current[selIdx];
    if (!piece) return;

    if (!canPlace(gridRef.current, piece, cell.row, cell.col)) return;

    // Place piece
    const newGrid = placePiece(gridRef.current, piece, cell.row, cell.col);

    // Detect lines to flash
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r].every((c) => c !== null)) fullRows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid.every((row) => row[c] !== null)) fullCols.push(c);
    }

    if (fullRows.length > 0 || fullCols.length > 0) {
      flashRowsRef.current = new Set(fullRows);
      flashColsRef.current = new Set(fullCols);
      flashTimerRef.current = 300;
    }

    // Clear lines
    const { newGrid: clearedGrid, cleared } = clearLines(newGrid);
    gridRef.current = clearedGrid;

    // Score: 10 per cell placed + 50 per line cleared + bonus for multiple
    const cellsPlaced = piece.cells.length;
    const lineBonus = cleared * 50 + (cleared > 1 ? cleared * 30 : 0);
    const points = cellsPlaced * 10 + lineBonus;
    scoreRef.current += points;

    if (scoreRef.current > bestScoreRef.current) {
      bestScoreRef.current = scoreRef.current;
      localStorage.setItem('blockblast-best', String(bestScoreRef.current));
      setBestScore(bestScoreRef.current);
    }
    setScore(scoreRef.current);
    if (cleared > 0) setLastCleared(cleared);

    // Update tray
    const newTray = [...trayRef.current];
    newTray[selIdx] = null;

    // If all tray slots used, refill
    const allUsed = newTray.every((p) => p === null);
    const finalTray = allUsed
      ? [randomPiece(), randomPiece(), randomPiece()]
      : newTray;

    trayRef.current = finalTray;
    setTray([...finalTray]);
    setSelected(null);
    selectedRef.current = null;
    hoverCellRef.current = null;

    // Check game over
    if (!hasAnyValidPlacement(clearedGrid, finalTray)) {
      setGameOver(true);
    }
  }, [gameOver, getCellFromEvent]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    hoverCellRef.current = getCellFromEvent(e);
  }, [getCellFromEvent]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleCanvasClick(e);
    hoverCellRef.current = null;
  }, [handleCanvasClick]);

  // ─── Reset ───────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    const newTray: (Piece | null)[] = [randomPiece(), randomPiece(), randomPiece()];
    gridRef.current = createEmptyGrid();
    trayRef.current = newTray;
    selectedRef.current = null;
    hoverCellRef.current = null;
    scoreRef.current = 0;
    flashRowsRef.current = new Set();
    flashColsRef.current = new Set();
    flashTimerRef.current = 0;
    setTray([...newTray]);
    setSelected(null);
    setScore(0);
    setGameOver(false);
    setLastCleared(0);
  }, []);

  const selectTrayPiece = useCallback((idx: number) => {
    if (gameOver) return;
    if (tray[idx] === null) return;
    setSelected((prev) => (prev === idx ? null : idx));
  }, [gameOver, tray]);

  return (
    <div className="flex flex-col items-center gap-5 w-full select-none">
      {/* Score row */}
      <div className="flex gap-6 justify-center">
        <div className="flex flex-col items-center bg-card/60 border border-neon-cyan/30 rounded-xl px-5 py-2.5 shadow-[0_0_12px_rgba(0,255,204,0.2)]">
          <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Score</span>
          <span className="font-orbitron text-2xl font-bold neon-text-cyan">{score}</span>
        </div>
        <div className="flex flex-col items-center bg-card/60 border border-neon-pink/30 rounded-xl px-5 py-2.5">
          <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Best</span>
          <span className="font-orbitron text-2xl font-bold neon-text-pink">{bestScore}</span>
        </div>
        {lastCleared > 0 && (
          <div className="flex flex-col items-center bg-card/60 border border-yellow-400/30 rounded-xl px-5 py-2.5 animate-pulse">
            <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Cleared</span>
            <span className="font-orbitron text-2xl font-bold text-yellow-400">+{lastCleared}</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-2xl overflow-hidden border-2 border-neon-purple/40 shadow-[0_0_30px_rgba(180,0,255,0.25)]"
        style={{ width: CANVAS_W, maxWidth: '100%' }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            cursor: selected !== null ? 'crosshair' : 'default',
            touchAction: 'none',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h2 className="font-orbitron text-3xl font-black neon-text-pink mb-2">GAME OVER</h2>
            <p className="font-rajdhani text-muted-foreground text-lg mb-1">Final Score</p>
            <p className="font-orbitron text-4xl font-bold neon-text-cyan mb-6">{score}</p>
            {score >= bestScore && score > 0 && (
              <p className="font-orbitron text-sm text-yellow-400 mb-4 animate-pulse">🏆 NEW BEST!</p>
            )}
            <button
              onClick={resetGame}
              className="font-orbitron text-sm font-bold uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-green text-background shadow-[0_0_18px_rgba(0,255,204,0.5)] hover:shadow-[0_0_28px_rgba(0,255,204,0.8)] transition-all duration-200"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Tray */}
      <div className="flex flex-col items-center gap-3">
        <p className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">
          {selected !== null ? 'Click the grid to place' : 'Select a piece'}
        </p>
        <div className="flex gap-4 justify-center">
          {tray.map((piece, idx) => (
            <PieceTile
              key={idx}
              piece={piece}
              selected={selected === idx}
              onClick={() => selectTrayPiece(idx)}
              disabled={gameOver || piece === null}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center max-w-sm">
        <p className="font-rajdhani text-muted-foreground text-sm leading-relaxed">
          <span className="text-neon-cyan font-semibold">Select</span> a piece from the tray, then{' '}
          <span className="text-neon-green font-semibold">click</span> the grid to place it.
          Fill complete <span className="text-yellow-400 font-semibold">rows or columns</span> to clear them and score big!
        </p>
      </div>
    </div>
  );
}
