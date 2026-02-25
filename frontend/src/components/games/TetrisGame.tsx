import { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 10;
const ROWS = 20;
const CELL = 30;
const W = COLS * CELL;
const H = ROWS * CELL;
const PREVIEW_SIZE = 4 * CELL;

const TETROMINOES = [
  { shape: [[1,1,1,1]], color: '#00ffff' },           // I
  { shape: [[1,1],[1,1]], color: '#ffff00' },          // O
  { shape: [[0,1,0],[1,1,1]], color: '#aa00ff' },      // T
  { shape: [[0,1,1],[1,1,0]], color: '#00ff88' },      // S
  { shape: [[1,1,0],[0,1,1]], color: '#ff4444' },      // Z
  { shape: [[1,0,0],[1,1,1]], color: '#0088ff' },      // J
  { shape: [[0,0,1],[1,1,1]], color: '#ff8800' },      // L
];

type Grid = (string | null)[][];

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return { shape: t.shape, color: t.color, x: Math.floor(COLS / 2) - Math.floor(t.shape[0].length / 2), y: 0 };
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, c) => shape.map((row) => row[c]).reverse());
}

function isValid(grid: Grid, shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && grid[ny][nx]) return false;
    }
  }
  return true;
}

function placePiece(grid: Grid, shape: number[][], x: number, y: number, color: string): Grid {
  const newGrid = grid.map((row) => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] && y + r >= 0) newGrid[y + r][x + c] = color;
    }
  }
  return newGrid;
}

function clearLines(grid: Grid): { grid: Grid; lines: number } {
  const newGrid = grid.filter((row) => row.some((cell) => !cell));
  const lines = ROWS - newGrid.length;
  while (newGrid.length < ROWS) newGrid.unshift(Array(COLS).fill(null));
  return { grid: newGrid, lines };
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    grid: emptyGrid(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    paused: false,
    started: false,
  });
  const dropTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLines, setDisplayLines] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'over'>('idle');

  const getDropInterval = (level: number) => Math.max(100, 800 - (level - 1) * 70);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;
    const ctx = canvas.getContext('2d');
    const pCtx = preview.getContext('2d');
    if (!ctx || !pCtx) return;

    const s = stateRef.current;

    // Main canvas
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }

    // Placed blocks
    s.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        ctx.fillStyle = cell;
        ctx.shadowColor = cell;
        ctx.shadowBlur = 6;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        ctx.shadowBlur = 0;
      });
    });

    // Ghost piece
    if (!s.gameOver && s.started) {
      let ghostY = s.current.y;
      while (isValid(s.grid, s.current.shape, s.current.x, ghostY + 1)) ghostY++;
      s.current.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = `${s.current.color}33`;
          ctx.strokeStyle = `${s.current.color}66`;
          ctx.lineWidth = 1;
          ctx.fillRect((s.current.x + c) * CELL + 1, (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
          ctx.strokeRect((s.current.x + c) * CELL + 1, (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
        });
      });
    }

    // Current piece
    if (!s.gameOver && s.started) {
      s.current.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          ctx.fillStyle = s.current.color;
          ctx.shadowColor = s.current.color;
          ctx.shadowBlur = 10;
          ctx.fillRect((s.current.x + c) * CELL + 1, (s.current.y + r) * CELL + 1, CELL - 2, CELL - 2);
          ctx.shadowBlur = 0;
        });
      });
    }

    // Overlays
    if (!s.started) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 28px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillText('TETRIS', W / 2, H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Rajdhani, sans-serif';
      ctx.fillText('Press SPACE to start', W / 2, H / 2 + 10);
    }

    if (s.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 28px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2);
    }

    if (s.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 28px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 20;
      ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Orbitron, monospace';
      ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
      ctx.fillStyle = '#00ffff';
      ctx.font = '13px Rajdhani, sans-serif';
      ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 44);
    }

    // Preview canvas
    pCtx.fillStyle = '#0a0a14';
    pCtx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    const ns = s.next;
    const offX = Math.floor((4 - ns.shape[0].length) / 2);
    const offY = Math.floor((4 - ns.shape.length) / 2);
    ns.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        pCtx.fillStyle = ns.color;
        pCtx.shadowColor = ns.color;
        pCtx.shadowBlur = 8;
        pCtx.fillRect((offX + c) * CELL + 1, (offY + r) * CELL + 1, CELL - 2, CELL - 2);
        pCtx.shadowBlur = 0;
      });
    });
  }, []);

  const drop = useCallback(() => {
    const s = stateRef.current;
    if (!s.started || s.gameOver || s.paused) return;

    if (isValid(s.grid, s.current.shape, s.current.x, s.current.y + 1)) {
      s.current.y++;
    } else {
      s.grid = placePiece(s.grid, s.current.shape, s.current.x, s.current.y, s.current.color);
      const { grid: newGrid, lines } = clearLines(s.grid);
      s.grid = newGrid;
      s.lines += lines;
      const lineScore = [0, 100, 300, 500, 800][lines] ?? 800;
      s.score += lineScore * s.level;
      s.level = Math.floor(s.lines / 10) + 1;
      setDisplayScore(s.score);
      setDisplayLines(s.lines);
      setDisplayLevel(s.level);

      s.current = s.next;
      s.next = randomPiece();

      if (!isValid(s.grid, s.current.shape, s.current.x, s.current.y)) {
        s.gameOver = true;
        setGameState('over');
        if (dropTimerRef.current) clearInterval(dropTimerRef.current);
      }
    }
    drawGame();
  }, [drawGame]);

  const resetGame = useCallback(() => {
    if (dropTimerRef.current) clearInterval(dropTimerRef.current);
    stateRef.current = {
      grid: emptyGrid(),
      current: randomPiece(),
      next: randomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      paused: false,
      started: true,
    };
    setDisplayScore(0);
    setDisplayLines(0);
    setDisplayLevel(1);
    setGameState('playing');
    dropTimerRef.current = setInterval(drop, getDropInterval(1));
    drawGame();
  }, [drop, drawGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!s.started || s.gameOver) { resetGame(); return; }
        s.paused = !s.paused;
        setGameState(s.paused ? 'paused' : 'playing');
        drawGame();
        return;
      }
      if (!s.started || s.gameOver || s.paused) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (isValid(s.grid, s.current.shape, s.current.x - 1, s.current.y)) { s.current.x--; drawGame(); }
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (isValid(s.grid, s.current.shape, s.current.x + 1, s.current.y)) { s.current.x++; drawGame(); }
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        drop();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        const rotated = rotate(s.current.shape);
        if (isValid(s.grid, rotated, s.current.x, s.current.y)) { s.current.shape = rotated; drawGame(); }
      }
      if (e.code === 'KeyZ') {
        e.preventDefault();
        // Hard drop
        while (isValid(s.grid, s.current.shape, s.current.x, s.current.y + 1)) s.current.y++;
        drop();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drop, drawGame, resetGame]);

  useEffect(() => {
    drawGame();
    return () => { if (dropTimerRef.current) clearInterval(dropTimerRef.current); };
  }, [drawGame]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-8 items-start">
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-xl border border-neon-cyan/30 max-w-full"
            tabIndex={0}
          />
        </div>
        <div className="flex flex-col gap-4 min-w-[120px]">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="font-orbitron text-xs text-muted-foreground uppercase tracking-widest mb-1">Score</div>
            <div className="font-orbitron text-xl font-bold neon-text-cyan">{displayScore}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="font-orbitron text-xs text-muted-foreground uppercase tracking-widest mb-1">Level</div>
            <div className="font-orbitron text-xl font-bold neon-text-green">{displayLevel}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="font-orbitron text-xs text-muted-foreground uppercase tracking-widest mb-1">Lines</div>
            <div className="font-orbitron text-xl font-bold neon-text-yellow">{displayLines}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="font-orbitron text-xs text-muted-foreground uppercase tracking-widest mb-2 text-center">Next</div>
            <canvas ref={previewRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="rounded" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-rajdhani">
        SPACE: start/pause • ←→: move • ↑/W: rotate • ↓/S: soft drop • Z: hard drop
      </p>
    </div>
  );
}
