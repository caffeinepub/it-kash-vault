import React, { useState, useCallback, useEffect, useRef } from 'react';

const ROWS = 9;
const COLS = 9;
const MINES = 10;

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

function makeCells(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function placeMines(cells: Cell[][], firstR: number, firstC: number): Cell[][] {
  const grid = cells.map((row) => row.map((c) => ({ ...c })));
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!grid[r][c].mine && !(r === firstR && c === firstC)) {
      grid[r][c].mine = true;
      placed++;
    }
  }
  // Calculate adjacency
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr; const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) count++;
        }
      }
      grid[r][c].adjacent = count;
    }
  }
  return grid;
}

function revealCells(grid: Cell[][], r: number, c: number): Cell[][] {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  const stack = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
    const cell = newGrid[cr][cc];
    if (cell.revealed || cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }
  return newGrid;
}

const adjacentColors = ['', '#00e5ff', '#ff6a00', '#ff2d78', '#bf5fff', '#ffe600', '#00e5ff', '#ffffff', '#aaaaaa'];

export default function MinesweeperGame() {
  const [cells, setCells] = useState<Cell[][]>(makeCells());
  const [status, setStatus] = useState<GameStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const minesPlacedRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const newGame = useCallback(() => {
    stopTimer();
    setCells(makeCells());
    setStatus('idle');
    setElapsed(0);
    setFlagCount(0);
    minesPlacedRef.current = false;
  }, [stopTimer]);

  const handleReveal = useCallback((r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;
    setCells((prev) => {
      const cell = prev[r][c];
      if (cell.revealed || cell.flagged) return prev;

      let grid = prev;

      // Place mines on first click
      if (!minesPlacedRef.current) {
        minesPlacedRef.current = true;
        grid = placeMines(prev, r, c);
        setStatus('playing');
        timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      }

      if (grid[r][c].mine) {
        // Reveal all mines
        const revealed = grid.map((row) =>
          row.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell))
        );
        setStatus('lost');
        stopTimer();
        return revealed;
      }

      const newGrid = revealCells(grid, r, c);

      // Check win
      const safeCells = ROWS * COLS - MINES;
      const revealedCount = newGrid.flat().filter((c) => c.revealed && !c.mine).length;
      if (revealedCount === safeCells) {
        setStatus('won');
        stopTimer();
      }

      return newGrid;
    });
  }, [status, stopTimer]);

  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === 'won' || status === 'lost' || status === 'idle') return;
    setCells((prev) => {
      const cell = prev[r][c];
      if (cell.revealed) return prev;
      const newGrid = prev.map((row) => row.map((c) => ({ ...c })));
      newGrid[r][c].flagged = !newGrid[r][c].flagged;
      setFlagCount((f) => newGrid[r][c].flagged ? f + 1 : f - 1);
      return newGrid;
    });
  }, [status]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const getCellStyle = (cell: Cell): React.CSSProperties => {
    if (cell.revealed) {
      if (cell.mine) return { background: '#ff2d78', borderColor: '#ff2d78', boxShadow: '0 0 8px #ff2d78' };
      return { background: 'oklch(0.14 0.02 265)', borderColor: 'oklch(0.22 0.03 265)' };
    }
    return {
      background: 'oklch(0.12 0.02 265)',
      borderColor: 'oklch(0.25 0.04 265)',
      cursor: 'pointer',
    };
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Minesweeper</h2>
        <p className="font-exo text-muted-foreground text-sm">Reveal all safe cells without hitting a mine!</p>
      </div>

      <div className="flex gap-6 items-center">
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-orange">{MINES - flagCount}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">💣 Mines</div>
        </div>
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-cyan">{formatTime(elapsed)}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Time</div>
        </div>
        <button
          onClick={newGame}
          className="font-exo font-semibold text-xs uppercase tracking-widest px-4 py-2 rounded border border-border text-muted-foreground hover:border-neon-orange/50 hover:text-neon-orange transition-all duration-200"
        >
          New Game
        </button>
      </div>

      <div
        className="grid gap-1 p-3 bg-card border border-border rounded-xl"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {cells.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleReveal(r, c)}
              onContextMenu={(e) => handleFlag(e, r, c)}
              className="w-9 h-9 rounded border text-sm font-chakra font-bold flex items-center justify-center transition-all duration-100 select-none"
              style={getCellStyle(cell)}
              disabled={cell.revealed}
            >
              {cell.flagged && !cell.revealed ? (
                <span>🚩</span>
              ) : cell.revealed ? (
                cell.mine ? (
                  <span>💣</span>
                ) : cell.adjacent > 0 ? (
                  <span style={{ color: adjacentColors[cell.adjacent] }}>{cell.adjacent}</span>
                ) : null
              ) : null}
            </button>
          ))
        )}
      </div>

      {(status === 'won' || status === 'lost') && (
        <div className={`text-center bg-card border rounded-xl p-6 w-full ${status === 'won' ? 'border-neon-cyan/40' : 'border-neon-pink/40'}`}>
          {status === 'won' ? (
            <>
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-chakra text-2xl font-black neon-text-cyan mb-2">You Win!</div>
              <div className="font-exo text-muted-foreground mb-4">
                Cleared in <span className="text-neon-cyan font-bold">{formatTime(elapsed)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">💥</div>
              <div className="font-chakra text-2xl font-black neon-text-pink mb-2">Boom!</div>
              <div className="font-exo text-muted-foreground mb-4">You hit a mine!</div>
            </>
          )}
          <button
            onClick={newGame}
            className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
          >
            New Game
          </button>
        </div>
      )}

      <div className="font-exo text-xs text-muted-foreground text-center">
        Left-click to reveal • Right-click to flag • Numbers show adjacent mines
      </div>
    </div>
  );
}
