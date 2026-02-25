import { useEffect, useRef, useState, useCallback } from 'react';

const COLS = 20;
const ROWS = 20;
const CELL = 24;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

function randomPos(snake: Pos[]): Pos {
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pos[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { x: 15, y: 10 } as Pos,
    score: 0,
    running: false,
    dead: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake-hs') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = 'rgba(57,255,20,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(CANVAS_W, y * CELL); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#ff2d78';
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(state.food.x * CELL + CELL / 2, state.food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    state.snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#39ff14' : `rgba(57,255,20,${0.9 - i * 0.03})`;
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = isHead ? 12 : 4;
      const padding = isHead ? 1 : 2;
      ctx.fillRect(seg.x * CELL + padding, seg.y * CELL + padding, CELL - padding * 2, CELL - padding * 2);
      ctx.shadowBlur = 0;
    });

    // Score
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 14px Orbitron, monospace';
    ctx.fillText(`${state.score}`, 8, 20);
    ctx.shadowBlur = 0;
  }, []);

  const tick = useCallback(() => {
    const state = stateRef.current;
    if (!state.running || state.dead) return;

    state.dir = state.nextDir;
    const head = state.snake[0];
    let nx = head.x, ny = head.y;
    if (state.dir === 'UP') ny--;
    else if (state.dir === 'DOWN') ny++;
    else if (state.dir === 'LEFT') nx--;
    else nx++;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      state.dead = true;
      state.running = false;
      const hs = Math.max(state.score, parseInt(localStorage.getItem('snake-hs') || '0'));
      localStorage.setItem('snake-hs', String(hs));
      setHighScore(hs);
      setGameOver(true);
      draw();
      return;
    }

    if (state.snake.some((s) => s.x === nx && s.y === ny)) {
      state.dead = true;
      state.running = false;
      const hs = Math.max(state.score, parseInt(localStorage.getItem('snake-hs') || '0'));
      localStorage.setItem('snake-hs', String(hs));
      setHighScore(hs);
      setGameOver(true);
      draw();
      return;
    }

    const newSnake = [{ x: nx, y: ny }, ...state.snake];
    if (nx === state.food.x && ny === state.food.y) {
      state.score++;
      state.food = randomPos(newSnake);
      setDisplayScore(state.score);
    } else {
      newSnake.pop();
    }
    state.snake = newSnake;
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const state = stateRef.current;
    state.snake = [{ x: 10, y: 10 }];
    state.dir = 'RIGHT';
    state.nextDir = 'RIGHT';
    state.food = randomPos(state.snake);
    state.score = 0;
    state.running = true;
    state.dead = false;
    setDisplayScore(0);
    setGameOver(false);
    setStarted(true);
    draw();
    intervalRef.current = setInterval(tick, 120);
  }, [draw, tick]);

  useEffect(() => {
    draw();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const state = stateRef.current;
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT',
      };
      const newDir = map[e.code];
      if (!newDir) return;
      e.preventDefault();
      const opposite: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      if (state.dir !== opposite[newDir]) {
        state.nextDir = newDir;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-8 mb-2">
        <div className="text-center">
          <p className="font-rajdhani text-muted-foreground text-xs uppercase tracking-widest">Score</p>
          <p className="font-orbitron text-xl font-bold neon-text-green">{displayScore}</p>
        </div>
        <div className="text-center">
          <p className="font-rajdhani text-muted-foreground text-xs uppercase tracking-widest">Best</p>
          <p className="font-orbitron text-xl font-bold neon-text-cyan">{highScore}</p>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="border border-neon-green/30 rounded-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-green mb-4">SNAKE</h2>
            <p className="font-rajdhani text-muted-foreground mb-6 text-center px-8">
              Use arrow keys or WASD to control the snake. Eat food to grow!
            </p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-green text-background px-8 py-3 rounded-lg shadow-neon-green-sm hover:shadow-neon-green transition-all duration-300">
              Start Game
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-pink mb-2">GAME OVER</h2>
            <p className="font-orbitron text-4xl font-black neon-text-green mb-1">{displayScore}</p>
            <p className="font-rajdhani text-muted-foreground mb-6">Best: {highScore}</p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-green text-background px-8 py-3 rounded-lg shadow-neon-green-sm hover:shadow-neon-green transition-all duration-300">
              Play Again
            </button>
          </div>
        )}
      </div>
      <p className="font-rajdhani text-muted-foreground text-sm">Arrow keys or WASD to move</p>
    </div>
  );
}
