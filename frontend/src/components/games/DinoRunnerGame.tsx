import React, { useRef, useEffect, useState, useCallback } from 'react';

const CANVAS_W = 700;
const CANVAS_H = 200;
const GROUND_Y = 160;
const DINO_X = 80;
const DINO_W = 40;
const DINO_H = 50;
const GRAVITY = 0.6;
const JUMP_VEL = -13;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.0015;
const CACTUS_MIN_GAP = 280;
const CACTUS_MAX_GAP = 520;

interface Cactus {
  x: number;
  w: number;
  h: number;
}

interface GameState {
  running: boolean;
  over: boolean;
  dinoY: number;
  dinoVY: number;
  onGround: boolean;
  cacti: Cactus[];
  score: number;
  speed: number;
  nextCactusIn: number;
  frame: number;
}

function makeInitialState(): GameState {
  return {
    running: false,
    over: false,
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,
    onGround: true,
    cacti: [],
    score: 0,
    speed: INITIAL_SPEED,
    nextCactusIn: 80,
    frame: 0,
  };
}

export default function DinoRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'over'>('idle');
  const [bestScore, setBestScore] = useState(0);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.onGround && s.running) {
      s.dinoVY = JUMP_VEL;
      s.onGround = false;
    }
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = makeInitialState();
    stateRef.current.running = true;
    setDisplayScore(0);
    setGameStatus('playing');
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    // Update
    if (s.running && !s.over) {
      s.frame++;
      s.score = Math.floor(s.frame / 6);
      s.speed = INITIAL_SPEED + s.frame * SPEED_INCREMENT;

      // Dino physics
      s.dinoVY += GRAVITY;
      s.dinoY += s.dinoVY;
      if (s.dinoY >= GROUND_Y - DINO_H) {
        s.dinoY = GROUND_Y - DINO_H;
        s.dinoVY = 0;
        s.onGround = true;
      }

      // Spawn cacti
      s.nextCactusIn--;
      if (s.nextCactusIn <= 0) {
        const h = 30 + Math.random() * 30;
        const w = 18 + Math.random() * 14;
        s.cacti.push({ x: CANVAS_W + 10, w, h });
        s.nextCactusIn = CACTUS_MIN_GAP + Math.random() * (CACTUS_MAX_GAP - CACTUS_MIN_GAP);
      }

      // Move cacti
      s.cacti = s.cacti
        .map((c) => ({ ...c, x: c.x - s.speed }))
        .filter((c) => c.x + c.w > -10);

      // Collision
      const dinoLeft = DINO_X + 4;
      const dinoRight = DINO_X + DINO_W - 4;
      const dinoTop = s.dinoY + 4;
      const dinoBottom = s.dinoY + DINO_H;
      for (const c of s.cacti) {
        if (
          dinoRight > c.x + 3 &&
          dinoLeft < c.x + c.w - 3 &&
          dinoBottom > GROUND_Y - c.h + 3 &&
          dinoTop < GROUND_Y
        ) {
          s.over = true;
          s.running = false;
          setBestScore((prev) => Math.max(prev, s.score));
          setGameStatus('over');
          break;
        }
      }

      if (s.frame % 6 === 0) setDisplayScore(s.score);
    }

    // Draw
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + s.frame * 0.3) % CANVAS_W);
      const sy = (i * 53) % (GROUND_Y - 20);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dino body
    const legOffset = s.onGround ? (s.frame % 12 < 6 ? 4 : -4) : 0;
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 12;
    // Body
    ctx.fillRect(DINO_X, s.dinoY, DINO_W, DINO_H - 10);
    // Head
    ctx.fillRect(DINO_X + 10, s.dinoY - 14, 22, 18);
    // Eye
    ctx.fillStyle = '#0a0a12';
    ctx.shadowBlur = 0;
    ctx.fillRect(DINO_X + 24, s.dinoY - 10, 5, 5);
    // Legs
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8;
    ctx.fillRect(DINO_X + 4, s.dinoY + DINO_H - 10 + legOffset, 10, 10);
    ctx.fillRect(DINO_X + 20, s.dinoY + DINO_H - 10 - legOffset, 10, 10);
    ctx.shadowBlur = 0;

    // Cacti
    for (const c of s.cacti) {
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      // Main trunk
      ctx.fillRect(c.x + c.w / 2 - 5, GROUND_Y - c.h, 10, c.h);
      // Arms
      ctx.fillRect(c.x, GROUND_Y - c.h * 0.65, c.w, 8);
      ctx.fillRect(c.x, GROUND_Y - c.h * 0.65 - 14, 8, 14);
      ctx.fillRect(c.x + c.w - 8, GROUND_Y - c.h * 0.65 - 14, 8, 14);
      ctx.shadowBlur = 0;
    }

    // Score
    ctx.fillStyle = '#ff6a00';
    ctx.font = 'bold 16px "Chakra Petch", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${s.score}`, CANVAS_W - 16, 28);
    ctx.textAlign = 'left';

    if (!s.over && !s.running && s.frame === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#ff6a00';
      ctx.font = 'bold 22px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press SPACE or Click to Start', CANVAS_W / 2, CANVAS_H / 2);
      ctx.textAlign = 'left';
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.running && !s.over) startGame();
        else jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump, startGame]);

  const handleCanvasClick = () => {
    const s = stateRef.current;
    if (!s.running && !s.over) startGame();
    else jump();
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      <div className="text-center">
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Dino Runner</h2>
        <p className="font-exo text-muted-foreground text-sm">Press Space or click to jump!</p>
      </div>

      <div className="flex gap-8">
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-orange">{displayScore}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Score</div>
        </div>
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-cyan">{bestScore}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Best</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleCanvasClick}
        className="rounded-xl border border-border cursor-pointer w-full"
        style={{ maxWidth: CANVAS_W, imageRendering: 'pixelated' }}
        tabIndex={0}
      />

      {gameStatus === 'over' && (
        <div className="text-center bg-card border border-neon-orange/40 rounded-xl p-6 w-full max-w-xs">
          <div className="font-chakra text-2xl font-black neon-text-pink mb-2">Game Over!</div>
          <div className="font-exo text-muted-foreground mb-1">Score</div>
          <div className="font-chakra text-4xl font-black neon-text-orange mb-1">{displayScore}</div>
          <div className="font-exo text-xs text-muted-foreground mb-4">Best: {bestScore}</div>
          <button
            onClick={startGame}
            className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      )}

      <div className="font-exo text-xs text-muted-foreground text-center">
        Space / Click / Tap to jump • Avoid the cacti • Speed increases over time
      </div>
    </div>
  );
}
