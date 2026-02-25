import { useEffect, useRef, useState, useCallback } from 'react';

const W = 480;
const H = 600;
const BIRD_X = 100;
const BIRD_R = 18;
const GRAVITY = 0.5;
const FLAP = -10;
const PIPE_W = 60;
const PIPE_GAP = 160;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 120;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    birdY: H / 2,
    birdVY: 0,
    pipes: [] as Pipe[],
    score: 0,
    frame: 0,
    running: false,
    dead: false,
    birdAngle: 0,
  });
  const animRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + s.frame * 0.2) % W;
      const sy = (i * 97) % (H * 0.6);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, H - 60, W, 60);
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, H - 60);
    ctx.lineTo(W, H - 60);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pipes
    for (const pipe of s.pipes) {
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
      ctx.fillRect(pipe.x - 5, pipe.topH - 20, PIPE_W + 10, 20);
      // Bottom pipe
      const botY = pipe.topH + PIPE_GAP;
      ctx.fillRect(pipe.x, botY, PIPE_W, H - botY - 60);
      ctx.fillRect(pipe.x - 5, botY, PIPE_W + 10, 20);
      ctx.shadowBlur = 0;
    }

    // Bird
    ctx.save();
    ctx.translate(BIRD_X, s.birdY);
    ctx.rotate(s.birdAngle);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#0a0a0f';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Wing
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Score
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 32px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(s.score), W / 2, 60);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.running || s.dead) return;
    s.birdVY = FLAP;
  }, []);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    const s = stateRef.current;
    s.birdY = H / 2;
    s.birdVY = 0;
    s.pipes = [];
    s.score = 0;
    s.frame = 0;
    s.running = true;
    s.dead = false;
    s.birdAngle = 0;
    setDisplayScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running || s.dead) return;

    s.frame++;
    s.birdVY += GRAVITY;
    s.birdY += s.birdVY;
    s.birdAngle = Math.min(Math.max(s.birdVY * 0.05, -0.5), 1.2);

    // Spawn pipes
    if (s.frame % PIPE_INTERVAL === 0) {
      const topH = 80 + Math.random() * (H - 60 - PIPE_GAP - 80);
      s.pipes.push({ x: W + PIPE_W, topH, passed: false });
    }

    // Move pipes
    for (const pipe of s.pipes) {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
        pipe.passed = true;
        s.score++;
        setDisplayScore(s.score);
      }
    }
    s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 20);

    // Collision
    const birdTop = s.birdY - BIRD_R;
    const birdBot = s.birdY + BIRD_R;
    const birdLeft = BIRD_X - BIRD_R;
    const birdRight = BIRD_X + BIRD_R;

    if (birdBot >= H - 60 || birdTop <= 0) {
      s.dead = true;
      s.running = false;
      setGameOver(true);
      draw();
      return;
    }

    for (const pipe of s.pipes) {
      if (birdRight > pipe.x + 5 && birdLeft < pipe.x + PIPE_W - 5) {
        if (birdTop < pipe.topH || birdBot > pipe.topH + PIPE_GAP) {
          s.dead = true;
          s.running = false;
          setGameOver(true);
          draw();
          return;
        }
      }
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (started && !gameOver) {
      animRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [started, gameOver, gameLoop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!started || gameOver) startGame();
        else flap();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flap, startGame, started, gameOver]);

  const handleClick = () => {
    if (!started || gameOver) startGame();
    else flap();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleClick}
          className="border border-neon-cyan/30 rounded-lg cursor-pointer"
          style={{ maxWidth: '100%', height: 'auto', maxHeight: '70vh' }}
        />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-yellow mb-4">FLAPPY BIRD</h2>
            <p className="font-rajdhani text-muted-foreground mb-6 text-center px-8">
              Click or press SPACE to flap. Avoid the pipes!
            </p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-yellow text-background px-8 py-3 rounded-lg shadow-neon-yellow hover:scale-105 transition-all duration-300">
              Start Game
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-pink mb-2">GAME OVER</h2>
            <p className="font-orbitron text-4xl font-black neon-text-yellow mb-6">{displayScore}</p>
            <button onClick={startGame} className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-yellow text-background px-8 py-3 rounded-lg shadow-neon-yellow hover:scale-105 transition-all duration-300">
              Try Again
            </button>
          </div>
        )}
      </div>
      <p className="font-rajdhani text-muted-foreground text-sm">Click or SPACE to flap</p>
    </div>
  );
}
