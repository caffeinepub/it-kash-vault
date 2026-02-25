import { useEffect, useRef, useState, useCallback } from 'react';

const W = 640;
const H = 480;
const PADDLE_W = 100;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const BALL_R = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = 56;
const BRICK_H = 20;
const BRICK_PAD = 4;
const BRICK_TOP = 60;

const BRICK_COLORS = ['#ff2d78', '#ff2d78', '#ffe600', '#ffe600', '#39ff14'];
const BRICK_GLOW = ['#ff2d78', '#ff2d78', '#ffe600', '#ffe600', '#39ff14'];

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  row: number;
}

function makeBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: c * (BRICK_W + BRICK_PAD) + 20,
        y: r * (BRICK_H + BRICK_PAD) + BRICK_TOP,
        alive: true,
        row: r,
      });
    }
  }
  return bricks;
}

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2,
    ballY: H / 2,
    ballVX: 3.5,
    ballVY: -4,
    bricks: makeBricks(),
    score: 0,
    lives: 3,
    running: false,
    won: false,
    lost: false,
    keys: { left: false, right: false },
  });
  const animRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(57,255,20,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = BRICK_COLORS[b.row];
      ctx.shadowColor = BRICK_GLOW[b.row];
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, BRICK_W, BRICK_H);
      ctx.shadowBlur = 0;
    }

    // Paddle
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 12;
    ctx.fillRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 14px Orbitron, monospace';
    ctx.fillText(`SCORE: ${s.score}`, 10, 30);
    ctx.fillText(`LIVES: ${s.lives}`, W - 120, 30);
    ctx.shadowBlur = 0;
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const s = stateRef.current;
    s.paddleX = W / 2 - PADDLE_W / 2;
    s.ballX = W / 2;
    s.ballY = H / 2;
    s.ballVX = 3.5;
    s.ballVY = -4;
    s.bricks = makeBricks();
    s.score = 0;
    s.lives = 3;
    s.running = true;
    s.won = false;
    s.lost = false;
    setDisplayScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setStarted(true);
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    // Paddle movement
    if (s.keys.left) s.paddleX = Math.max(0, s.paddleX - 6);
    if (s.keys.right) s.paddleX = Math.min(W - PADDLE_W, s.paddleX + 6);

    // Ball movement
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Wall bounce
    if (s.ballX - BALL_R <= 0) { s.ballX = BALL_R; s.ballVX = Math.abs(s.ballVX); }
    if (s.ballX + BALL_R >= W) { s.ballX = W - BALL_R; s.ballVX = -Math.abs(s.ballVX); }
    if (s.ballY - BALL_R <= 0) { s.ballY = BALL_R; s.ballVY = Math.abs(s.ballVY); }

    // Paddle bounce
    if (
      s.ballY + BALL_R >= PADDLE_Y &&
      s.ballY + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
      s.ballX >= s.paddleX - BALL_R &&
      s.ballX <= s.paddleX + PADDLE_W + BALL_R
    ) {
      const rel = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      s.ballVX = rel * 5;
      s.ballVY = -Math.abs(s.ballVY);
    }

    // Ball lost
    if (s.ballY + BALL_R > H) {
      s.lives--;
      setLives(s.lives);
      if (s.lives <= 0) {
        s.running = false;
        s.lost = true;
        setGameOver(true);
        draw();
        return;
      }
      s.ballX = W / 2;
      s.ballY = H / 2;
      s.ballVX = 3.5 * (Math.random() > 0.5 ? 1 : -1);
      s.ballVY = -4;
    }

    // Brick collision
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (
        s.ballX + BALL_R > b.x &&
        s.ballX - BALL_R < b.x + BRICK_W &&
        s.ballY + BALL_R > b.y &&
        s.ballY - BALL_R < b.y + BRICK_H
      ) {
        b.alive = false;
        s.score += 10;
        setDisplayScore(s.score);
        const overlapLeft = s.ballX + BALL_R - b.x;
        const overlapRight = b.x + BRICK_W - (s.ballX - BALL_R);
        const overlapTop = s.ballY + BALL_R - b.y;
        const overlapBottom = b.y + BRICK_H - (s.ballY - BALL_R);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapTop || minOverlap === overlapBottom) s.ballVY *= -1;
        else s.ballVX *= -1;
        break;
      }
    }

    // Win check
    if (s.bricks.every((b) => !b.alive)) {
      s.running = false;
      s.won = true;
      setWon(true);
      draw();
      return;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  useEffect(() => {
    if (started && !gameOver && !won) {
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [started, gameOver, won, gameLoop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === 'ArrowLeft') { e.preventDefault(); s.keys.left = true; }
      if (e.code === 'ArrowRight') { e.preventDefault(); s.keys.right = true; }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.code === 'ArrowLeft') s.keys.left = false;
      if (e.code === 'ArrowRight') s.keys.right = false;
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKey); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    stateRef.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, mx - PADDLE_W / 2));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-8 mb-2">
        <div className="text-center">
          <p className="font-rajdhani text-muted-foreground text-xs uppercase tracking-widest">Score</p>
          <p className="font-orbitron text-xl font-bold neon-text-green">{displayScore}</p>
        </div>
        <div className="text-center">
          <p className="font-rajdhani text-muted-foreground text-xs uppercase tracking-widest">Lives</p>
          <p className="font-orbitron text-xl font-bold neon-text-pink">{lives}</p>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseMove={handleMouseMove}
          className="border border-neon-cyan/30 rounded-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-cyan mb-4">BREAKOUT</h2>
            <p className="font-rajdhani text-muted-foreground mb-6 text-center px-8">
              Move mouse or use arrow keys to control the paddle. Break all the bricks!
            </p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-cyan text-background px-8 py-3 rounded-lg shadow-neon-cyan hover:scale-105 transition-all duration-300">
              Start Game
            </button>
          </div>
        )}
        {(gameOver || won) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 rounded-lg">
            <h2 className={`font-orbitron text-3xl font-black mb-2 ${won ? 'neon-text-green' : 'neon-text-pink'}`}>
              {won ? 'YOU WIN!' : 'GAME OVER'}
            </h2>
            <p className="font-orbitron text-4xl font-black neon-text-cyan mb-6">{displayScore}</p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-cyan text-background px-8 py-3 rounded-lg shadow-neon-cyan hover:scale-105 transition-all duration-300">
              Play Again
            </button>
          </div>
        )}
      </div>
      <p className="font-rajdhani text-muted-foreground text-sm">Mouse or arrow keys to move paddle</p>
    </div>
  );
}
