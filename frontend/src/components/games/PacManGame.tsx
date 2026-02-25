import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// ── Maze Layout ────────────────────────────────────────────────────────────────
// 0=empty, 1=wall, 2=dot, 3=power pellet
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,1,1,1,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,0,0,0,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = MAZE_TEMPLATE.length;
const COLS = MAZE_TEMPLATE[0].length;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;

type Dir = { x: number; y: number };
const DIRS: Record<string, Dir> = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

interface Entity {
  x: number; // grid col (float for smooth movement)
  y: number; // grid row (float)
  dir: Dir;
  nextDir: Dir;
}

interface Ghost {
  x: number;
  y: number;
  dir: Dir;
  color: string;
  frightened: boolean;
  frightenTimer: number;
}

function isWall(maze: number[][], row: number, col: number): boolean {
  const r = Math.round(row);
  const c = Math.round(col);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return maze[r][c] === 1;
}

function canMove(maze: number[][], x: number, y: number, dir: Dir): boolean {
  const nx = x + dir.x;
  const ny = y + dir.y;
  return !isWall(maze, ny, nx);
}

const GHOST_COLORS = ['#ff2d78', '#ff9500', '#00f5ff', '#c542f5'];

function initMaze(): number[][] {
  return MAZE_TEMPLATE.map(row => [...row]);
}

function countDots(maze: number[][]): number {
  let count = 0;
  for (const row of maze) for (const cell of row) if (cell === 2 || cell === 3) count++;
  return count;
}

function spawnGhosts(): Ghost[] {
  return GHOST_COLORS.map((color, i) => ({
    x: 9 + i % 2,
    y: 9 + Math.floor(i / 2),
    dir: DIRS.left,
    color,
    frightened: false,
    frightenTimer: 0,
  }));
}

const SPEED = 0.1;
const GHOST_SPEED = 0.07;
const FRIGHTEN_DURATION = 200; // frames

export function PacManGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeRef = useRef<number[][]>(initMaze());
  const playerRef = useRef<Entity>({ x: 10, y: 16, dir: DIRS.right, nextDir: DIRS.right });
  const ghostsRef = useRef<Ghost[]>(spawnGhosts());
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const dotsLeftRef = useRef(countDots(initMaze()));
  const gameOverRef = useRef(false);
  const wonRef = useRef(false);
  const rafRef = useRef<number>(0);
  const mouthRef = useRef(0);
  const mouthDirRef = useRef(1);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    const maze = mazeRef.current;

    // Draw maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = maze[r][c];
        const px = c * CELL;
        const py = r * CELL;
        if (cell === 1) {
          ctx.fillStyle = '#1a3a6e';
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        } else if (cell === 2) {
          ctx.fillStyle = '#f5e642';
          ctx.shadowColor = '#f5e642';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (cell === 3) {
          ctx.fillStyle = '#ff9500';
          ctx.shadowColor = '#ff9500';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw player (Pac-Man)
    const p = playerRef.current;
    const px = p.x * CELL + CELL / 2;
    const py = p.y * CELL + CELL / 2;
    const mouth = mouthRef.current;
    let startAngle = mouth * (Math.PI / 180);
    let endAngle = (360 - mouth) * (Math.PI / 180);

    // Rotate based on direction
    let rotation = 0;
    if (p.dir === DIRS.right) rotation = 0;
    else if (p.dir === DIRS.left) rotation = Math.PI;
    else if (p.dir === DIRS.up) rotation = -Math.PI / 2;
    else if (p.dir === DIRS.down) rotation = Math.PI / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);
    ctx.fillStyle = '#f5e642';
    ctx.shadowColor = '#f5e642';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, CELL / 2 - 2, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Animate mouth
    mouthRef.current += 4 * mouthDirRef.current;
    if (mouthRef.current >= 30) mouthDirRef.current = -1;
    if (mouthRef.current <= 0) mouthDirRef.current = 1;

    // Draw ghosts
    for (const ghost of ghostsRef.current) {
      const gx = ghost.x * CELL + CELL / 2;
      const gy = ghost.y * CELL + CELL / 2;
      const r = CELL / 2 - 2;
      const color = ghost.frightened ? '#4287f5' : ghost.color;

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(gx, gy - 2, r, Math.PI, 0);
      ctx.lineTo(gx + r, gy + r);
      // Wavy bottom
      const waves = 3;
      for (let i = 0; i < waves; i++) {
        const wx = gx + r - (i * 2 * r / waves) - r / waves;
        ctx.quadraticCurveTo(wx + r / waves, gy + r + 4, wx, gy + r);
      }
      ctx.lineTo(gx - r, gy + r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyes
      if (!ghost.frightened) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00f';
        ctx.beginPath(); ctx.arc(gx - 3, gy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx + 5, gy - 4, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }, []);

  const moveGhost = useCallback((ghost: Ghost, maze: number[][]) => {
    const possibleDirs = Object.values(DIRS).filter(d => {
      if (d.x === -ghost.dir.x && d.y === -ghost.dir.y) return false; // no reverse
      return canMove(maze, ghost.x, ghost.y, d);
    });

    // At intersections, pick random direction
    const atIntersection = Math.abs(ghost.x - Math.round(ghost.x)) < 0.05 && Math.abs(ghost.y - Math.round(ghost.y)) < 0.05;
    if (atIntersection && possibleDirs.length > 0) {
      if (possibleDirs.length > 1 || !canMove(maze, ghost.x, ghost.y, ghost.dir)) {
        ghost.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      }
    }

    if (canMove(maze, ghost.x, ghost.y, ghost.dir)) {
      ghost.x += ghost.dir.x * GHOST_SPEED;
      ghost.y += ghost.dir.y * GHOST_SPEED;
    }

    // Snap to grid
    ghost.x = Math.max(0, Math.min(COLS - 1, ghost.x));
    ghost.y = Math.max(0, Math.min(ROWS - 1, ghost.y));

    if (ghost.frightened) {
      ghost.frightenTimer--;
      if (ghost.frightenTimer <= 0) ghost.frightened = false;
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (gameOverRef.current || wonRef.current) return;

    const maze = mazeRef.current;
    const player = playerRef.current;

    // Try to change direction
    if (canMove(maze, player.x, player.y, player.nextDir)) {
      player.dir = player.nextDir;
    }

    // Move player
    if (canMove(maze, player.x, player.y, player.dir)) {
      player.x += player.dir.x * SPEED;
      player.y += player.dir.y * SPEED;
    }

    // Clamp
    player.x = Math.max(0, Math.min(COLS - 1, player.x));
    player.y = Math.max(0, Math.min(ROWS - 1, player.y));

    // Eat dots
    const pr = Math.round(player.y);
    const pc = Math.round(player.x);
    if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) {
      const cell = maze[pr][pc];
      if (cell === 2) {
        maze[pr][pc] = 0;
        scoreRef.current += 10;
        dotsLeftRef.current--;
        setScore(scoreRef.current);
      } else if (cell === 3) {
        maze[pr][pc] = 0;
        scoreRef.current += 50;
        dotsLeftRef.current--;
        setScore(scoreRef.current);
        // Frighten ghosts
        for (const g of ghostsRef.current) {
          g.frightened = true;
          g.frightenTimer = FRIGHTEN_DURATION;
        }
      }
    }

    // Check win
    if (dotsLeftRef.current <= 0) {
      wonRef.current = true;
      setWon(true);
      return;
    }

    // Move ghosts
    for (const ghost of ghostsRef.current) {
      moveGhost(ghost, maze);
    }

    // Check ghost collision
    for (const ghost of ghostsRef.current) {
      const dx = Math.abs(ghost.x - player.x);
      const dy = Math.abs(ghost.y - player.y);
      if (dx < 0.8 && dy < 0.8) {
        if (ghost.frightened) {
          ghost.frightened = false;
          ghost.x = 10; ghost.y = 9;
          scoreRef.current += 200;
          setScore(scoreRef.current);
        } else {
          livesRef.current--;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            gameOverRef.current = true;
            setGameOver(true);
            drawGame();
            return;
          }
          // Reset positions
          player.x = 10; player.y = 16;
          player.dir = DIRS.right; player.nextDir = DIRS.right;
          ghostsRef.current = spawnGhosts();
        }
      }
    }

    drawGame();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame, moveGhost]);

  const startGame = useCallback(() => {
    mazeRef.current = initMaze();
    playerRef.current = { x: 10, y: 16, dir: DIRS.right, nextDir: DIRS.right };
    ghostsRef.current = spawnGhosts();
    scoreRef.current = 0;
    livesRef.current = 3;
    dotsLeftRef.current = countDots(initMaze());
    gameOverRef.current = false;
    wonRef.current = false;
    mouthRef.current = 0;
    mouthDirRef.current = 1;
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setStarted(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!started) return;
      const map: Record<string, Dir> = {
        ArrowUp: DIRS.up, ArrowDown: DIRS.down,
        ArrowLeft: DIRS.left, ArrowRight: DIRS.right,
        w: DIRS.up, s: DIRS.down, a: DIRS.left, d: DIRS.right,
      };
      if (map[e.key]) {
        e.preventDefault();
        playerRef.current.nextDir = map[e.key];
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* HUD */}
      <div className="flex items-center gap-8 font-orbitron text-sm">
        <div>
          <span className="text-muted-foreground text-xs tracking-wider">SCORE </span>
          <span className="text-neon-green font-bold">{score.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs tracking-wider">LIVES </span>
          {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
            <span key={i} className="text-neon-yellow text-base">●</span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border border-neon-green/30 rounded"
          style={{ boxShadow: '0 0 20px rgba(0,245,255,0.15)' }}
        />
        {!started && !gameOver && !won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded">
            <p className="font-orbitron text-neon-yellow text-2xl font-bold mb-2" style={{ textShadow: '0 0 12px #f5e642' }}>PAC-MAN</p>
            <p className="font-rajdhani text-muted-foreground text-sm mb-6 text-center px-4">
              Arrow keys to move &nbsp;|&nbsp; Eat all dots &nbsp;|&nbsp; Avoid ghosts!
            </p>
            <Button
              onClick={startGame}
              className="bg-neon-yellow/20 border border-neon-yellow text-neon-yellow hover:bg-neon-yellow/30 font-orbitron font-bold tracking-wider"
            >
              START GAME
            </Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded">
            <p className="font-orbitron text-neon-pink text-2xl font-bold mb-1" style={{ textShadow: '0 0 12px #ff2d78' }}>GAME OVER</p>
            <p className="font-rajdhani text-neon-green text-lg mb-6">Score: {score}</p>
            <Button
              onClick={startGame}
              className="bg-neon-green/20 border border-neon-green text-neon-green hover:bg-neon-green/30 font-orbitron font-bold tracking-wider"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}
        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded">
            <p className="font-orbitron text-neon-green text-2xl font-bold mb-1 neon-text-green">YOU WIN!</p>
            <p className="font-rajdhani text-neon-yellow text-lg mb-6">Score: {score}</p>
            <Button
              onClick={startGame}
              className="bg-neon-green/20 border border-neon-green text-neon-green hover:bg-neon-green/30 font-orbitron font-bold tracking-wider"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}
      </div>

      <div className="text-center font-rajdhani text-xs text-muted-foreground tracking-wider">
        ARROW KEYS TO MOVE &nbsp;|&nbsp; EAT ALL DOTS &nbsp;|&nbsp; ORANGE PELLETS FRIGHTEN GHOSTS
      </div>
    </div>
  );
}
