import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

const W = 800;
const H = 500;
const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_SIZE = 12;
const PADDLE_SPEED = 6;
const WIN_SCORE = 7;

interface PongState {
  ball: { x: number; y: number; vx: number; vy: number };
  p1: { y: number; score: number };
  p2: { y: number; score: number };
  running: boolean;
  winner: number | null;
}

function makeState(): PongState {
  const angle = (Math.random() * 0.5 - 0.25);
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    ball: { x: W / 2, y: H / 2, vx: 5 * dir, vy: 5 * Math.sin(angle) },
    p1: { y: H / 2 - PADDLE_H / 2, score: 0 },
    p2: { y: H / 2 - PADDLE_H / 2, score: 0 },
    running: false,
    winner: null,
  };
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PongState>(makeState());
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<number | null>(null);

  const { playPaddleHit, playWallBounce, playPointScored, playWinFanfare } = useSoundEffect();

  const resetBall = useCallback((scorer: number) => {
    const angle = (Math.random() * 0.5 - 0.25);
    const dir = scorer === 1 ? 1 : -1;
    stateRef.current.ball = {
      x: W / 2, y: H / 2,
      vx: 5 * dir,
      vy: 5 * Math.sin(angle),
    };
  }, []);

  const startGame = useCallback(() => {
    const s = makeState();
    s.running = true;
    stateRef.current = s;
    setScores({ p1: 0, p2: 0 });
    setWinner(null);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && (!stateRef.current.running || stateRef.current.winner !== null)) {
        startGame();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;

      if (s.running && !s.winner) {
        // Paddle movement
        if (keysRef.current.has('KeyW') && s.p1.y > 0) s.p1.y -= PADDLE_SPEED;
        if (keysRef.current.has('KeyS') && s.p1.y < H - PADDLE_H) s.p1.y += PADDLE_SPEED;
        if (keysRef.current.has('ArrowUp') && s.p2.y > 0) s.p2.y -= PADDLE_SPEED;
        if (keysRef.current.has('ArrowDown') && s.p2.y < H - PADDLE_H) s.p2.y += PADDLE_SPEED;

        // Ball movement
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;

        // Wall bounce (top/bottom)
        if (s.ball.y <= 0) {
          s.ball.y = 0;
          s.ball.vy *= -1;
          playWallBounce();
        }
        if (s.ball.y + BALL_SIZE >= H) {
          s.ball.y = H - BALL_SIZE;
          s.ball.vy *= -1;
          playWallBounce();
        }

        // Paddle 1 collision (left)
        if (
          s.ball.x <= 30 + PADDLE_W &&
          s.ball.x >= 30 &&
          s.ball.y + BALL_SIZE >= s.p1.y &&
          s.ball.y <= s.p1.y + PADDLE_H
        ) {
          s.ball.x = 30 + PADDLE_W;
          const hitPos = (s.ball.y + BALL_SIZE / 2 - s.p1.y) / PADDLE_H;
          const angle = (hitPos - 0.5) * Math.PI * 0.6;
          const speed = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy) + 0.1;
          s.ball.vx = Math.abs(Math.cos(angle) * speed);
          s.ball.vy = Math.sin(angle) * speed;
          playPaddleHit();
        }

        // Paddle 2 collision (right)
        const p2x = W - 30 - PADDLE_W;
        if (
          s.ball.x + BALL_SIZE >= p2x &&
          s.ball.x + BALL_SIZE <= p2x + PADDLE_W + 5 &&
          s.ball.y + BALL_SIZE >= s.p2.y &&
          s.ball.y <= s.p2.y + PADDLE_H
        ) {
          s.ball.x = p2x - BALL_SIZE;
          const hitPos = (s.ball.y + BALL_SIZE / 2 - s.p2.y) / PADDLE_H;
          const angle = (hitPos - 0.5) * Math.PI * 0.6;
          const speed = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy) + 0.1;
          s.ball.vx = -Math.abs(Math.cos(angle) * speed);
          s.ball.vy = Math.sin(angle) * speed;
          playPaddleHit();
        }

        // Scoring
        if (s.ball.x < 0) {
          s.p2.score++;
          playPointScored();
          if (s.p2.score >= WIN_SCORE) {
            s.winner = 2;
            s.running = false;
            playWinFanfare();
            setWinner(2);
          } else {
            resetBall(2);
          }
          setScores({ p1: s.p1.score, p2: s.p2.score });
        }
        if (s.ball.x + BALL_SIZE > W) {
          s.p1.score++;
          playPointScored();
          if (s.p1.score >= WIN_SCORE) {
            s.winner = 1;
            s.running = false;
            playWinFanfare();
            setWinner(1);
          } else {
            resetBall(1);
          }
          setScores({ p1: s.p1.score, p2: s.p2.score });
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scores
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 48px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.p1.score), W / 4, 70);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(String(s.p2.score), (3 * W) / 4, 70);
      ctx.textAlign = 'left';

      // Paddles
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.fillRect(30, s.p1.y, PADDLE_W, PADDLE_H);
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.fillRect(W - 30 - PADDLE_W, s.p2.y, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(s.ball.x, s.ball.y, BALL_SIZE, BALL_SIZE);
      ctx.shadowBlur = 0;

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Exo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('W/S', W / 4, H - 15);
      ctx.fillText('↑/↓', (3 * W) / 4, H - 15);
      ctx.textAlign = 'left';

      // Overlays
      if (!s.running && !s.winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 40px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PONG', W / 2, H / 2 - 40);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '18px "Exo 2", sans-serif';
        ctx.fillText('Press SPACE to start', W / 2, H / 2 + 10);
        ctx.fillText('P1: W/S  |  P2: ↑/↓  |  First to 7 wins', W / 2, H / 2 + 45);
        ctx.textAlign = 'left';
      }

      if (s.winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = s.winner === 1 ? '#f97316' : '#22d3ee';
        ctx.font = 'bold 44px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`PLAYER ${s.winner} WINS!`, W / 2, H / 2 - 20);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '18px "Exo 2", sans-serif';
        ctx.fillText('Press SPACE to play again', W / 2, H / 2 + 30);
        ctx.textAlign = 'left';
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playPaddleHit, playWallBounce, playPointScored, playWinFanfare, resetBall]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-8 mb-2">
        <span className="font-chakra text-neon-orange text-xl font-bold">P1: {scores.p1}</span>
        <span className="font-chakra text-foreground text-lg">PONG</span>
        <span className="font-chakra text-neon-cyan text-xl font-bold">P2: {scores.p2}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-neon-orange/30 max-w-full"
        tabIndex={0}
      />
      {winner && (
        <div className="text-neon-orange font-chakra text-lg font-bold">
          Player {winner} wins! Press SPACE to play again.
        </div>
      )}
      <div className="text-muted-foreground text-sm font-exo">
        P1: <kbd className="bg-muted px-1 rounded">W</kbd>/<kbd className="bg-muted px-1 rounded">S</kbd> &nbsp;|&nbsp;
        P2: <kbd className="bg-muted px-1 rounded">↑</kbd>/<kbd className="bg-muted px-1 rounded">↓</kbd> &nbsp;|&nbsp;
        First to {WIN_SCORE} wins
      </div>
    </div>
  );
}
