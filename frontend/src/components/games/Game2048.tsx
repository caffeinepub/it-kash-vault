import { useState, useEffect, useCallback, useRef } from 'react';

type Grid = (number | null)[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

function addRandomTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!grid[r][c]) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map((row) => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function initGrid(): Grid {
  return addRandomTile(addRandomTile(createEmptyGrid()));
}

function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
  const nums = row.filter((v) => v !== null) as number[];
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      score += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged.map((v) => (v === 0 ? null : v)), score };
}

function moveLeft(grid: Grid): { grid: Grid; score: number } {
  let totalScore = 0;
  const newGrid = grid.map((row) => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    return newRow;
  });
  return { grid: newGrid, score: totalScore };
}

function rotateGrid(grid: Grid): Grid {
  return grid[0].map((_, c) => grid.map((row) => row[c]).reverse());
}

function move(grid: Grid, dir: 'left' | 'right' | 'up' | 'down'): { grid: Grid; score: number } {
  let g = grid;
  let rotations = 0;
  if (dir === 'right') rotations = 2;
  else if (dir === 'up') rotations = 3;
  else if (dir === 'down') rotations = 1;
  for (let i = 0; i < rotations; i++) g = rotateGrid(g);
  const { grid: moved, score } = moveLeft(g);
  let result = moved;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateGrid(result);
  return { grid: result, score };
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

function hasValidMoves(grid: Grid): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

const TILE_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  2: { bg: '#1a2a1a', text: '#39ff14', glow: '#39ff14' },
  4: { bg: '#1a2a2a', text: '#00f5ff', glow: '#00f5ff' },
  8: { bg: '#2a1a2a', text: '#bf5fff', glow: '#bf5fff' },
  16: { bg: '#2a1a1a', text: '#ff2d78', glow: '#ff2d78' },
  32: { bg: '#2a2a1a', text: '#ffe600', glow: '#ffe600' },
  64: { bg: '#1a1a2a', text: '#00f5ff', glow: '#00f5ff' },
  128: { bg: '#2a1a2a', text: '#bf5fff', glow: '#bf5fff' },
  256: { bg: '#2a1a1a', text: '#ff2d78', glow: '#ff2d78' },
  512: { bg: '#2a2a1a', text: '#ffe600', glow: '#ffe600' },
  1024: { bg: '#1a2a2a', text: '#39ff14', glow: '#39ff14' },
  2048: { bg: '#2a2a2a', text: '#ffe600', glow: '#ffe600' },
};

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('2048-best') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    setGrid((prev) => {
      const { grid: moved, score: gained } = move(prev, dir);
      if (gridsEqual(prev, moved)) return prev;
      const newGrid = addRandomTile(moved);
      setScore((s) => {
        const ns = s + gained;
        setBestScore((b) => {
          const nb = Math.max(b, ns);
          localStorage.setItem('2048-best', String(nb));
          return nb;
        });
        return ns;
      });
      if (!hasValidMoves(newGrid)) setGameOver(true);
      if (newGrid.some((row) => row.some((v) => v === 2048))) setWon(true);
      return newGrid;
    });
  }, []);

  const newGame = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
      };
      const dir = map[e.code];
      if (dir) { e.preventDefault(); handleMove(dir); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove, gameOver]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? 'right' : 'left');
    else handleMove(dy > 0 ? 'down' : 'up');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full max-w-sm">
        <h2 className="font-orbitron text-2xl font-black neon-text-yellow">2048</h2>
        <div className="flex gap-4">
          <div className="text-center bg-card border border-border rounded px-3 py-1">
            <p className="font-rajdhani text-muted-foreground text-xs uppercase">Score</p>
            <p className="font-orbitron text-lg font-bold neon-text-green">{score}</p>
          </div>
          <div className="text-center bg-card border border-border rounded px-3 py-1">
            <p className="font-rajdhani text-muted-foreground text-xs uppercase">Best</p>
            <p className="font-orbitron text-lg font-bold neon-text-cyan">{bestScore}</p>
          </div>
        </div>
      </div>

      <div
        className="relative bg-card border border-border rounded-xl p-3 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-4 gap-2">
          {grid.map((row, r) =>
            row.map((val, c) => {
              const colors = val ? TILE_COLORS[val] || { bg: '#2a2a2a', text: '#ffe600', glow: '#ffe600' } : null;
              return (
                <div
                  key={`${r}-${c}`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center transition-all duration-100"
                  style={{
                    backgroundColor: colors ? colors.bg : '#111118',
                    boxShadow: colors ? `0 0 8px ${colors.glow}40` : 'none',
                  }}
                >
                  {val && (
                    <span
                      className="font-orbitron font-black"
                      style={{
                        color: colors!.text,
                        textShadow: `0 0 8px ${colors!.glow}`,
                        fontSize: val >= 1000 ? '0.75rem' : val >= 100 ? '1rem' : '1.25rem',
                      }}
                    >
                      {val}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {(gameOver || won) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 rounded-xl">
            <h3 className={`font-orbitron text-2xl font-black mb-2 ${won ? 'neon-text-yellow' : 'neon-text-pink'}`}>
              {won ? '2048!' : 'GAME OVER'}
            </h3>
            <p className="font-orbitron text-3xl font-black neon-text-green mb-4">{score}</p>
            <button onClick={newGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-yellow text-background px-6 py-2 rounded-lg hover:scale-105 transition-all duration-300">
              New Game
            </button>
          </div>
        )}
      </div>

      <button onClick={newGame} className="font-orbitron font-bold text-xs uppercase tracking-widest border border-neon-yellow text-neon-yellow px-4 py-2 rounded-lg hover:bg-neon-yellow/10 transition-all duration-200">
        New Game
      </button>
      <p className="font-rajdhani text-muted-foreground text-sm">Arrow keys or WASD to slide tiles</p>
    </div>
  );
}
