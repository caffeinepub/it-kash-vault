import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const GROUND_Y = 240;
const DINO_X = 80;
const DINO_W = 44;
const DINO_H = 52;
const GRAVITY = 0.6;
const JUMP_VEL = -13;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;

interface Cactus {
  x: number;
  w: number;
  h: number;
}

interface GameState {
  running: boolean;
  gameOver: boolean;
  score: number;
  speed: number;
  dinoY: number;
  dinoVY: number;
  onGround: boolean;
  cacti: Cactus[];
  frame: number;
  legFrame: number;
}

function makeInitialState(): GameState {
  return {
    running: false,
    gameOver: false,
    score: 0,
    speed: INITIAL_SPEED,
    dinoY: GROUND_Y - DINO_H,
    dinoVY: 0,
    onGround: true,
    cacti: [],
    frame: 0,
    legFrame: 0,
  };
}

export default function DinoRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const lastMilestoneRef = useRef(0);
  const wasOnGroundRef = useRef(true);

  const {
    playDinoJump,
    playDinoLand,
    playDinoGameOver,
    playDinoMilestone,
  } = useSoundEffect();

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.onGround && s.running && !s.gameOver) {
      s.dinoVY = JUMP_VEL;
      s.onGround = false;
      wasOnGroundRef.current = false;
      playDinoJump();
    }
  }, [playDinoJump]);

  const startGame = useCallback(() => {
    stateRef.current = makeInitialState();
    stateRef.current.running = true;
    lastMilestoneRef.current = 0;
    wasOnGroundRef.current = true;
    setDisplayScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!stateRef.current.running || stateRef.current.gameOver) {
          startGame();
        } else {
          jump();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump, startGame]);

  const drawDino = useCallback((ctx: CanvasRenderingContext2D, y: number, legFrame: number, onGround: boolean) => {
    ctx.fillStyle = '#4ade80';
    // Body
    ctx.fillRect(DINO_X, y, DINO_W, DINO_H - 10);
    // Head
    ctx.fillRect(DINO_X + 10, y - 16, 28, 20);
    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(DINO_X + 30, y - 12, 5, 5);
    // Legs
    ctx.fillStyle = '#4ade80';
    if (onGround) {
      const leg1 = legFrame < 10 ? 0 : 8;
      const leg2 = legFrame < 10 ? 8 : 0;
      ctx.fillRect(DINO_X + 6, y + DINO_H - 10, 10, 10 + leg1);
      ctx.fillRect(DINO_X + 22, y + DINO_H - 10, 10, 10 + leg2);
    } else {
      ctx.fillRect(DINO_X + 6, y + DINO_H - 10, 10, 14);
      ctx.fillRect(DINO_X + 22, y + DINO_H - 10, 10, 14);
    }
  }, []);

  const drawCactus = useCallback((ctx: CanvasRenderingContext2D, c: Cactus) => {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(c.x, GROUND_Y - c.h, c.w, c.h);
    ctx.fillRect(c.x - 8, GROUND_Y - c.h + 20, 8, 16);
    ctx.fillRect(c.x + c.w, GROUND_Y - c.h + 30, 8, 12);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;

      if (s.running && !s.gameOver) {
        s.frame++;
        s.speed += SPEED_INCREMENT;
        s.score = Math.floor(s.frame / 6);

        // Milestone sound every 100 points
        const milestone = Math.floor(s.score / 100);
        if (milestone > lastMilestoneRef.current && s.score > 0) {
          lastMilestoneRef.current = milestone;
          playDinoMilestone();
        }

        // Leg animation
        if (s.onGround) s.legFrame = (s.legFrame + 1) % 20;

        // Gravity
        s.dinoVY += GRAVITY;
        s.dinoY += s.dinoVY;
        if (s.dinoY >= GROUND_Y - DINO_H) {
          s.dinoY = GROUND_Y - DINO_H;
          s.dinoVY = 0;
          if (!s.onGround) {
            s.onGround = true;
            wasOnGroundRef.current = true;
            playDinoLand();
          }
        }

        // Spawn cacti
        if (s.frame % Math.floor(80 - s.speed * 3) === 0) {
          const h = 40 + Math.random() * 30;
          s.cacti.push({ x: CANVAS_WIDTH + 10, w: 20 + Math.random() * 10, h });
        }

        // Move cacti
        s.cacti = s.cacti.map(c => ({ ...c, x: c.x - s.speed })).filter(c => c.x + c.w > -10);

        // Collision
        for (const c of s.cacti) {
          const dinoLeft = DINO_X + 4;
          const dinoRight = DINO_X + DINO_W - 4;
          const dinoTop = s.dinoY + 4;
          const dinoBottom = GROUND_Y;
          const cLeft = c.x;
          const cRight = c.x + c.w;
          const cTop = GROUND_Y - c.h;
          if (dinoRight > cLeft && dinoLeft < cRight && dinoBottom > cTop && dinoTop < GROUND_Y) {
            s.gameOver = true;
            s.running = false;
            playDinoGameOver();
            setGameOver(true);
          }
        }

        setDisplayScore(s.score);
      }

      // Draw
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.fillStyle = '#1e3a2f';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 3);

      // Score
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 18px "Chakra Petch", monospace';
      ctx.fillText(`SCORE: ${s.score}`, CANVAS_WIDTH - 160, 30);

      // Cacti
      s.cacti.forEach(c => drawCactus(ctx, c));

      // Dino
      drawDino(ctx, s.dinoY, s.legFrame, s.onGround);

      // Overlays
      if (!s.running && !s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 32px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DINO RUNNER', CANVAS_WIDTH / 2, 110);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '18px "Exo 2", sans-serif';
        ctx.fillText('Press SPACE or tap to start', CANVAS_WIDTH / 2, 155);
        ctx.textAlign = 'left';
      }

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 110);
        ctx.fillStyle = '#f97316';
        ctx.font = '22px "Chakra Petch", monospace';
        ctx.fillText(`SCORE: ${s.score}`, CANVAS_WIDTH / 2, 155);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px "Exo 2", sans-serif';
        ctx.fillText('Press SPACE or tap to restart', CANVAS_WIDTH / 2, 190);
        ctx.textAlign = 'left';
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawDino, drawCactus, playDinoLand, playDinoGameOver, playDinoMilestone]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-6 mb-2">
        <span className="font-chakra text-neon-orange text-lg font-bold">DINO RUNNER</span>
        <span className="font-chakra text-neon-cyan text-lg">Score: {displayScore}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-lg border border-neon-orange/30 cursor-pointer max-w-full"
        style={{ imageRendering: 'pixelated' }}
        onClick={() => {
          if (!stateRef.current.running || stateRef.current.gameOver) {
            startGame();
          } else {
            jump();
          }
        }}
        tabIndex={0}
      />
      <div className="text-muted-foreground text-sm font-exo">
        Press <kbd className="bg-muted px-1 rounded">SPACE</kbd> or tap to jump
      </div>
    </div>
  );
}
