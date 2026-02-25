import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// ── Constants ──────────────────────────────────────────────────────────────────
const W = 600;
const H = 500;
const PLAYER_W = 40;
const PLAYER_H = 20;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 7;
const ENEMY_BULLET_SPEED = 3;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 10;
const ALIEN_W = 36;
const ALIEN_H = 24;
const ALIEN_GAP_X = 12;
const ALIEN_GAP_Y = 14;
const ALIEN_STEP = 12;
const ALIEN_DROP = 16;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Player {
  x: number;
  y: number;
}

interface Alien {
  x: number;
  y: number;
  alive: boolean;
  row: number;
}

interface Bullet {
  x: number;
  y: number;
  active: boolean;
}

interface GameState {
  player: Player;
  aliens: Alien[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  lives: number;
  score: number;
  alienDir: number; // 1 = right, -1 = left
  alienMoveTimer: number;
  alienMoveInterval: number;
  enemyShootTimer: number;
  gameOver: boolean;
  won: boolean;
}

function initAliens(): Alien[] {
  const aliens: Alien[] = [];
  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      aliens.push({
        x: 60 + c * (ALIEN_W + ALIEN_GAP_X),
        y: 60 + r * (ALIEN_H + ALIEN_GAP_Y),
        alive: true,
        row: r,
      });
    }
  }
  return aliens;
}

function initState(): GameState {
  return {
    player: { x: W / 2 - PLAYER_W / 2, y: H - 60 },
    aliens: initAliens(),
    playerBullets: [],
    enemyBullets: [],
    lives: 3,
    score: 0,
    alienDir: 1,
    alienMoveTimer: 0,
    alienMoveInterval: 60,
    enemyShootTimer: 0,
    gameOver: false,
    won: false,
  };
}

const ALIEN_COLORS = ['#ff2d78', '#ff2d78', '#ff9500', '#ff9500', '#00f5ff', '#00f5ff'];

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, row: number, frame: number) {
  const color = ALIEN_COLORS[row] ?? '#c542f5';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  if (row < 2) {
    // Top row: squid-like
    ctx.fillRect(x + 10, y, 16, 6);
    ctx.fillRect(x + 6, y + 6, 24, 8);
    ctx.fillRect(x + 2, y + 14, 32, 6);
    ctx.fillRect(x + (frame ? 0 : 4), y + 18, 8, 6);
    ctx.fillRect(x + (frame ? 28 : 24), y + 18, 8, 6);
  } else if (row < 4) {
    // Middle row: crab-like
    ctx.fillRect(x + 4, y + 2, 28, 6);
    ctx.fillRect(x + 2, y + 8, 32, 8);
    ctx.fillRect(x + 6, y + 16, 8, 6);
    ctx.fillRect(x + 22, y + 16, 8, 6);
    ctx.fillRect(x + (frame ? 0 : 2), y + 10, 6, 4);
    ctx.fillRect(x + (frame ? 30 : 28), y + 10, 6, 4);
  } else {
    // Bottom row: octopus-like
    ctx.fillRect(x + 8, y, 20, 6);
    ctx.fillRect(x + 4, y + 6, 28, 8);
    ctx.fillRect(x + 2, y + 14, 32, 6);
    ctx.fillRect(x + (frame ? 0 : 4), y + 18, 10, 4);
    ctx.fillRect(x + (frame ? 26 : 22), y + 18, 10, 4);
  }
  ctx.shadowBlur = 0;
}

export function SpaceInvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const lastShotRef = useRef(0);

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
    const gs = stateRef.current;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 17) % W);
      const sy = ((i * 97 + 31) % H);
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground line
    ctx.strokeStyle = 'rgba(0,245,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 30);
    ctx.lineTo(W, H - 30);
    ctx.stroke();

    // Player ship
    const p = gs.player;
    ctx.fillStyle = '#42f554';
    ctx.shadowColor = '#42f554';
    ctx.shadowBlur = 12;
    // Body
    ctx.fillRect(p.x + 8, p.y + 8, PLAYER_W - 16, PLAYER_H - 8);
    // Cockpit
    ctx.fillRect(p.x + 14, p.y, PLAYER_W - 28, 10);
    // Wings
    ctx.fillRect(p.x, p.y + 12, 10, 8);
    ctx.fillRect(p.x + PLAYER_W - 10, p.y + 12, 10, 8);
    // Gun
    ctx.fillRect(p.x + PLAYER_W / 2 - 2, p.y - 4, 4, 8);
    ctx.shadowBlur = 0;

    // Aliens
    const frame = Math.floor(frameRef.current / 20) % 2;
    for (const alien of gs.aliens) {
      if (alien.alive) {
        drawAlien(ctx, alien.x, alien.y, alien.row, frame);
      }
    }

    // Player bullets
    for (const b of gs.playerBullets) {
      if (b.active) {
        ctx.fillStyle = '#42f554';
        ctx.shadowColor = '#42f554';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        ctx.shadowBlur = 0;
      }
    }

    // Enemy bullets
    for (const b of gs.enemyBullets) {
      if (b.active) {
        ctx.fillStyle = '#ff2d78';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y, 4, 10);
        ctx.shadowBlur = 0;
      }
    }

    frameRef.current++;
  }, []);

  const gameLoop = useCallback(() => {
    if (stateRef.current.gameOver || stateRef.current.won) return;
    const gs = stateRef.current;
    const keys = keysRef.current;

    // Move player
    if (keys.has('ArrowLeft') && gs.player.x > 0) {
      gs.player.x -= PLAYER_SPEED;
    }
    if (keys.has('ArrowRight') && gs.player.x + PLAYER_W < W) {
      gs.player.x += PLAYER_SPEED;
    }

    // Shoot
    if (keys.has(' ')) {
      const now = frameRef.current;
      if (now - lastShotRef.current > 20) {
        lastShotRef.current = now;
        gs.playerBullets.push({
          x: gs.player.x + PLAYER_W / 2,
          y: gs.player.y,
          active: true,
        });
      }
    }

    // Move player bullets
    for (const b of gs.playerBullets) {
      if (b.active) {
        b.y -= BULLET_SPEED;
        if (b.y < 0) b.active = false;
      }
    }

    // Move enemy bullets
    for (const b of gs.enemyBullets) {
      if (b.active) {
        b.y += ENEMY_BULLET_SPEED;
        if (b.y > H) b.active = false;
      }
    }

    // Move aliens
    gs.alienMoveTimer++;
    if (gs.alienMoveTimer >= gs.alienMoveInterval) {
      gs.alienMoveTimer = 0;
      const alive = gs.aliens.filter(a => a.alive);
      if (alive.length === 0) {
        gs.won = true;
        setWon(true);
        drawGame();
        return;
      }

      const minX = Math.min(...alive.map(a => a.x));
      const maxX = Math.max(...alive.map(a => a.x + ALIEN_W));
      let drop = false;

      if (gs.alienDir === 1 && maxX + ALIEN_STEP >= W - 10) {
        drop = true;
      } else if (gs.alienDir === -1 && minX - ALIEN_STEP <= 10) {
        drop = true;
      }

      if (drop) {
        for (const a of gs.aliens) a.y += ALIEN_DROP;
        gs.alienDir *= -1;
        // Speed up
        gs.alienMoveInterval = Math.max(10, gs.alienMoveInterval - 3);
      } else {
        for (const a of gs.aliens) a.x += gs.alienDir * ALIEN_STEP;
      }

      // Check if aliens reached bottom
      for (const a of gs.aliens) {
        if (a.alive && a.y + ALIEN_H >= H - 30) {
          gs.gameOver = true;
          setGameOver(true);
          drawGame();
          return;
        }
      }
    }

    // Enemy shooting
    gs.enemyShootTimer++;
    if (gs.enemyShootTimer >= 45) {
      gs.enemyShootTimer = 0;
      const alive = gs.aliens.filter(a => a.alive);
      if (alive.length > 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        gs.enemyBullets.push({
          x: shooter.x + ALIEN_W / 2,
          y: shooter.y + ALIEN_H,
          active: true,
        });
      }
    }

    // Bullet-alien collision
    for (const b of gs.playerBullets) {
      if (!b.active) continue;
      for (const a of gs.aliens) {
        if (!a.alive) continue;
        if (b.x >= a.x && b.x <= a.x + ALIEN_W && b.y >= a.y && b.y <= a.y + ALIEN_H) {
          b.active = false;
          a.alive = false;
          const points = (ALIEN_ROWS - a.row) * 10;
          gs.score += points;
          setScore(gs.score);
          gs.alienMoveInterval = Math.max(10, gs.alienMoveInterval - 1);
        }
      }
    }

    // Enemy bullet-player collision
    for (const b of gs.enemyBullets) {
      if (!b.active) continue;
      if (
        b.x >= gs.player.x && b.x <= gs.player.x + PLAYER_W &&
        b.y >= gs.player.y && b.y <= gs.player.y + PLAYER_H
      ) {
        b.active = false;
        gs.lives--;
        setLives(gs.lives);
        if (gs.lives <= 0) {
          gs.gameOver = true;
          setGameOver(true);
          drawGame();
          return;
        }
        // Reset player position
        gs.player.x = W / 2 - PLAYER_W / 2;
      }
    }

    // Check win
    if (gs.aliens.every(a => !a.alive)) {
      gs.won = true;
      setWon(true);
      drawGame();
      return;
    }

    // Cleanup inactive bullets
    gs.playerBullets = gs.playerBullets.filter(b => b.active);
    gs.enemyBullets = gs.enemyBullets.filter(b => b.active);

    drawGame();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [drawGame]);

  const startGame = useCallback(() => {
    stateRef.current = initState();
    frameRef.current = 0;
    lastShotRef.current = 0;
    keysRef.current.clear();
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setStarted(true);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tracking-wider">LIVES </span>
          {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
            <span key={i} className="text-neon-green text-base">▲</span>
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
            <p className="font-orbitron text-neon-cyan text-2xl font-bold mb-2" style={{ textShadow: '0 0 12px #00f5ff' }}>SPACE INVADERS</p>
            <p className="font-rajdhani text-muted-foreground text-sm mb-6 text-center px-4">
              ← → Move ship &nbsp;|&nbsp; Space to shoot &nbsp;|&nbsp; Destroy all aliens!
            </p>
            <Button
              onClick={startGame}
              className="bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/30 font-orbitron font-bold tracking-wider"
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
            <p className="font-orbitron text-neon-green text-2xl font-bold mb-1 neon-text-green">EARTH SAVED!</p>
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
        ← → MOVE &nbsp;|&nbsp; SPACE SHOOT &nbsp;|&nbsp; DESTROY ALL ALIENS BEFORE THEY LAND!
      </div>
    </div>
  );
}
