import React, { useRef, useEffect, useState, useCallback } from 'react';

const CW = 700;
const CH = 450;
const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_SIZE = 12;
const PADDLE_SPEED = 6;
const WIN_SCORE = 7;

interface PongState {
  running: boolean;
  over: boolean;
  winner: number;
  p1Y: number;
  p2Y: number;
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  score1: number;
  score2: number;
  keys: Set<string>;
}

function makeInitialState(): PongState {
  return {
    running: false,
    over: false,
    winner: 0,
    p1Y: CH / 2 - PADDLE_H / 2,
    p2Y: CH / 2 - PADDLE_H / 2,
    ballX: CW / 2,
    ballY: CH / 2,
    ballVX: 5 * (Math.random() > 0.5 ? 1 : -1),
    ballVY: (Math.random() * 4 - 2),
    score1: 0,
    score2: 0,
    keys: new Set(),
  };
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PongState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [scores, setScores] = useState({ s1: 0, s2: 0 });
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'over'>('idle');
  const [winner, setWinner] = useState(0);

  const resetBall = (state: PongState, dir: number) => {
    state.ballX = CW / 2;
    state.ballY = CH / 2;
    state.ballVX = 5 * dir;
    state.ballVY = Math.random() * 4 - 2;
  };

  const startGame = useCallback(() => {
    const s = makeInitialState();
    s.running = true;
    stateRef.current = s;
    setScores({ s1: 0, s2: 0 });
    setGameStatus('playing');
    setWinner(0);
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    if (s.running && !s.over) {
      // Move paddles
      if (s.keys.has('w') || s.keys.has('W')) s.p1Y = Math.max(0, s.p1Y - PADDLE_SPEED);
      if (s.keys.has('s') || s.keys.has('S')) s.p1Y = Math.min(CH - PADDLE_H, s.p1Y + PADDLE_SPEED);
      if (s.keys.has('ArrowUp')) s.p2Y = Math.max(0, s.p2Y - PADDLE_SPEED);
      if (s.keys.has('ArrowDown')) s.p2Y = Math.min(CH - PADDLE_H, s.p2Y + PADDLE_SPEED);

      // Move ball
      s.ballX += s.ballVX;
      s.ballY += s.ballVY;

      // Wall bounce
      if (s.ballY <= 0) { s.ballY = 0; s.ballVY = Math.abs(s.ballVY); }
      if (s.ballY + BALL_SIZE >= CH) { s.ballY = CH - BALL_SIZE; s.ballVY = -Math.abs(s.ballVY); }

      // Paddle 1 collision
      if (
        s.ballX <= 30 + PADDLE_W &&
        s.ballX >= 30 &&
        s.ballY + BALL_SIZE >= s.p1Y &&
        s.ballY <= s.p1Y + PADDLE_H
      ) {
        s.ballX = 30 + PADDLE_W;
        const hitPos = (s.ballY + BALL_SIZE / 2 - s.p1Y) / PADDLE_H;
        s.ballVX = Math.abs(s.ballVX) * 1.05;
        s.ballVY = (hitPos - 0.5) * 10;
        if (Math.abs(s.ballVX) > 14) s.ballVX = 14;
      }

      // Paddle 2 collision
      const p2X = CW - 30 - PADDLE_W;
      if (
        s.ballX + BALL_SIZE >= p2X &&
        s.ballX + BALL_SIZE <= p2X + PADDLE_W + 4 &&
        s.ballY + BALL_SIZE >= s.p2Y &&
        s.ballY <= s.p2Y + PADDLE_H
      ) {
        s.ballX = p2X - BALL_SIZE;
        const hitPos = (s.ballY + BALL_SIZE / 2 - s.p2Y) / PADDLE_H;
        s.ballVX = -Math.abs(s.ballVX) * 1.05;
        s.ballVY = (hitPos - 0.5) * 10;
        if (Math.abs(s.ballVX) > 14) s.ballVX = -14;
      }

      // Score
      if (s.ballX < 0) {
        s.score2++;
        setScores({ s1: s.score1, s2: s.score2 });
        if (s.score2 >= WIN_SCORE) {
          s.over = true; s.winner = 2;
          setWinner(2); setGameStatus('over');
        } else resetBall(s, 1);
      }
      if (s.ballX > CW) {
        s.score1++;
        setScores({ s1: s.score1, s2: s.score2 });
        if (s.score1 >= WIN_SCORE) {
          s.over = true; s.winner = 1;
          setWinner(1); setGameStatus('over');
        } else resetBall(s, -1);
      }
    }

    // Draw
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, CW, CH);

    // Center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CW / 2, 0);
    ctx.lineTo(CW / 2, CH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores
    ctx.fillStyle = '#ff6a00';
    ctx.font = 'bold 48px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 15;
    ctx.fillText(String(s.score1), CW / 4, 60);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.fillText(String(s.score2), (3 * CW) / 4, 60);
    ctx.shadowBlur = 0;

    // Paddle 1
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 12;
    ctx.fillRect(30, s.p1Y, PADDLE_W, PADDLE_H);

    // Paddle 2
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(CW - 30 - PADDLE_W, s.p2Y, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillRect(s.ballX, s.ballY, BALL_SIZE, BALL_SIZE);
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px "Exo 2", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('W/S', 36, CH - 12);
    ctx.textAlign = 'right';
    ctx.fillText('↑/↓', CW - 36, CH - 12);
    ctx.textAlign = 'left';

    if (!s.running && !s.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#ff6a00';
      ctx.font = 'bold 24px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff6a00';
      ctx.shadowBlur = 12;
      ctx.fillText('Click to Start', CW / 2, CH / 2);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      stateRef.current.keys.add(e.key);
      if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => stateRef.current.keys.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
      <div className="text-center">
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Pong</h2>
        <p className="font-exo text-muted-foreground text-sm">First to {WIN_SCORE} wins!</p>
      </div>

      <div className="flex gap-12 items-center">
        <div className="text-center">
          <div className="font-chakra text-3xl font-black neon-text-orange">{scores.s1}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Player 1</div>
          <div className="font-exo text-xs text-muted-foreground">W / S</div>
        </div>
        <div className="font-chakra text-xl text-muted-foreground">VS</div>
        <div className="text-center">
          <div className="font-chakra text-3xl font-black neon-text-cyan">{scores.s2}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Player 2</div>
          <div className="font-exo text-xs text-muted-foreground">↑ / ↓</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        onClick={() => { if (!stateRef.current.running && !stateRef.current.over) startGame(); }}
        className="rounded-xl border border-border cursor-pointer w-full"
        style={{ maxWidth: CW }}
        tabIndex={0}
      />

      {gameStatus === 'over' && (
        <div className="text-center bg-card border border-neon-orange/40 rounded-xl p-6 w-full max-w-xs">
          <div className="font-chakra text-2xl font-black neon-text-orange mb-2">
            Player {winner} Wins! 🏆
          </div>
          <div className="font-chakra text-3xl font-black mb-4">
            <span className="neon-text-orange">{scores.s1}</span>
            <span className="text-muted-foreground mx-2">—</span>
            <span className="neon-text-cyan">{scores.s2}</span>
          </div>
          <button
            onClick={startGame}
            className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      )}

      {gameStatus === 'idle' && (
        <button
          onClick={startGame}
          className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
        >
          Start Game
        </button>
      )}
    </div>
  );
}
