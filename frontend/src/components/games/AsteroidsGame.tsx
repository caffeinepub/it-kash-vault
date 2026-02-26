import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

const W = 800;
const H = 600;
const SHIP_SIZE = 18;
const BULLET_SPEED = 10;
const BULLET_LIFE = 60;
const ASTEROID_SPEEDS = { large: 1.2, medium: 1.8, small: 2.8 };
const ASTEROID_SIZES = { large: 45, medium: 25, small: 13 };

type AsteroidSize = 'large' | 'medium' | 'small';

interface Vec2 { x: number; y: number; }
interface Ship { pos: Vec2; vel: Vec2; angle: number; alive: boolean; }
interface Bullet { pos: Vec2; vel: Vec2; life: number; }
interface Asteroid { id: number; pos: Vec2; vel: Vec2; size: AsteroidSize; angle: number; spin: number; }

interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  score: number;
  running: boolean;
  gameOver: boolean;
  frame: number;
}

let asteroidIdCounter = 0;

function randomAsteroid(size: AsteroidSize, pos?: Vec2): Asteroid {
  const angle = Math.random() * Math.PI * 2;
  const speed = ASTEROID_SPEEDS[size];
  const spawnPos = pos ?? {
    x: Math.random() < 0.5 ? Math.random() * 100 : W - Math.random() * 100,
    y: Math.random() * H,
  };
  return {
    id: asteroidIdCounter++,
    pos: { ...spawnPos },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    size,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.04,
  };
}

function makeInitialState(): GameState {
  return {
    ship: { pos: { x: W / 2, y: H / 2 }, vel: { x: 0, y: 0 }, angle: -Math.PI / 2, alive: true },
    bullets: [],
    asteroids: Array.from({ length: 5 }, () => randomAsteroid('large')),
    score: 0,
    running: false,
    gameOver: false,
    frame: 0,
  };
}

function wrap(v: Vec2) {
  if (v.x < 0) v.x += W;
  if (v.x > W) v.x -= W;
  if (v.y < 0) v.y += H;
  if (v.y > H) v.y -= H;
}

function dist(a: Vec2, b: Vec2) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const thrustStopRef = useRef<(() => void) | null>(null);
  const wasThrustingRef = useRef(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const lastShotRef = useRef(0);

  const {
    playLaser,
    playLargeExplosion,
    playSmallExplosion,
    startThrust,
    playShipExplosion,
  } = useSoundEffect();

  const startGame = useCallback(() => {
    stateRef.current = makeInitialState();
    stateRef.current.running = true;
    setDisplayScore(0);
    setGameOver(false);
    wasThrustingRef.current = false;
    if (thrustStopRef.current) { thrustStopRef.current(); thrustStopRef.current = null; }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space') {
        if (!stateRef.current.running || stateRef.current.gameOver) {
          startGame();
        }
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
      // Single declaration of s used throughout the entire loop function
      const s = stateRef.current;

      // ── Update ──────────────────────────────────────────────────────────────
      if (s.running && !s.gameOver) {
        s.frame++;
        const keys = keysRef.current;

        // Rotation
        if (keys.has('ArrowLeft')) s.ship.angle -= 0.07;
        if (keys.has('ArrowRight')) s.ship.angle += 0.07;

        // Thrust
        const thrusting = keys.has('ArrowUp');
        if (thrusting) {
          s.ship.vel.x += Math.cos(s.ship.angle) * 0.25;
          s.ship.vel.y += Math.sin(s.ship.angle) * 0.25;
          const speed = Math.sqrt(s.ship.vel.x ** 2 + s.ship.vel.y ** 2);
          if (speed > 8) {
            s.ship.vel.x = (s.ship.vel.x / speed) * 8;
            s.ship.vel.y = (s.ship.vel.y / speed) * 8;
          }
        }

        // Thrust sound management
        if (thrusting && !wasThrustingRef.current) {
          wasThrustingRef.current = true;
          thrustStopRef.current = startThrust();
        } else if (!thrusting && wasThrustingRef.current) {
          wasThrustingRef.current = false;
          if (thrustStopRef.current) { thrustStopRef.current(); thrustStopRef.current = null; }
        }

        // Friction
        s.ship.vel.x *= 0.99;
        s.ship.vel.y *= 0.99;

        // Move ship
        s.ship.pos.x += s.ship.vel.x;
        s.ship.pos.y += s.ship.vel.y;
        wrap(s.ship.pos);

        // Shoot
        if (keys.has('Space') && s.frame - lastShotRef.current > 12) {
          lastShotRef.current = s.frame;
          s.bullets.push({
            pos: {
              x: s.ship.pos.x + Math.cos(s.ship.angle) * SHIP_SIZE,
              y: s.ship.pos.y + Math.sin(s.ship.angle) * SHIP_SIZE,
            },
            vel: {
              x: s.ship.vel.x + Math.cos(s.ship.angle) * BULLET_SPEED,
              y: s.ship.vel.y + Math.sin(s.ship.angle) * BULLET_SPEED,
            },
            life: BULLET_LIFE,
          });
          playLaser();
        }

        // Move bullets
        s.bullets = s.bullets
          .map(b => ({ ...b, pos: { x: b.pos.x + b.vel.x, y: b.pos.y + b.vel.y }, life: b.life - 1 }))
          .filter(b => b.life > 0);
        s.bullets.forEach(b => wrap(b.pos));

        // Move asteroids
        s.asteroids.forEach(a => {
          a.pos.x += a.vel.x;
          a.pos.y += a.vel.y;
          a.angle += a.spin;
          wrap(a.pos);
        });

        // Bullet-asteroid collisions
        const newAsteroids: Asteroid[] = [];
        const hitAsteroidIds = new Set<number>();
        const hitBulletIndices = new Set<number>();

        s.bullets.forEach((b, bi) => {
          s.asteroids.forEach(a => {
            if (hitAsteroidIds.has(a.id)) return;
            const r = ASTEROID_SIZES[a.size];
            if (dist(b.pos, a.pos) < r) {
              hitAsteroidIds.add(a.id);
              hitBulletIndices.add(bi);
              if (a.size === 'large') {
                s.score += 20;
                newAsteroids.push(randomAsteroid('medium', { ...a.pos }));
                newAsteroids.push(randomAsteroid('medium', { ...a.pos }));
                playLargeExplosion();
              } else if (a.size === 'medium') {
                s.score += 50;
                newAsteroids.push(randomAsteroid('small', { ...a.pos }));
                newAsteroids.push(randomAsteroid('small', { ...a.pos }));
                playSmallExplosion();
              } else {
                s.score += 100;
                playSmallExplosion();
              }
            }
          });
        });

        s.asteroids = s.asteroids.filter(a => !hitAsteroidIds.has(a.id)).concat(newAsteroids);
        s.bullets = s.bullets.filter((_, i) => !hitBulletIndices.has(i));

        // Spawn new wave
        if (s.asteroids.length === 0) {
          for (let i = 0; i < 5; i++) s.asteroids.push(randomAsteroid('large'));
        }

        // Ship-asteroid collision
        for (const a of s.asteroids) {
          const r = ASTEROID_SIZES[a.size];
          if (dist(s.ship.pos, a.pos) < r + SHIP_SIZE * 0.7) {
            s.gameOver = true;
            s.running = false;
            if (thrustStopRef.current) { thrustStopRef.current(); thrustStopRef.current = null; }
            wasThrustingRef.current = false;
            playShipExplosion();
            setGameOver(true);
            break;
          }
        }

        setDisplayScore(s.score);
      }

      // ── Draw ────────────────────────────────────────────────────────────────
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137 + 50) % W);
        const sy = ((i * 97 + 30) % H);
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Asteroids
      s.asteroids.forEach(a => {
        const r = ASTEROID_SIZES[a.size];
        ctx.save();
        ctx.translate(a.pos.x, a.pos.y);
        ctx.rotate(a.angle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#94a3b8';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        const sides = a.size === 'large' ? 9 : a.size === 'medium' ? 7 : 6;
        for (let i = 0; i < sides; i++) {
          const ang = (i / sides) * Math.PI * 2;
          const jitter = r * (0.75 + ((a.id * (i + 1) * 7) % 25) / 100);
          const px = Math.cos(ang) * jitter;
          const py = Math.sin(ang) * jitter;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Bullets
      s.bullets.forEach(b => {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Ship
      if (s.ship.alive && !s.gameOver) {
        ctx.save();
        ctx.translate(s.ship.pos.x, s.ship.pos.y);
        ctx.rotate(s.ship.angle);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(SHIP_SIZE, 0);
        ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
        ctx.lineTo(-SHIP_SIZE * 0.4, 0);
        ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
        ctx.closePath();
        ctx.stroke();
        // Thrust flame
        if (keysRef.current.has('ArrowUp')) {
          ctx.strokeStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-SHIP_SIZE * 0.4, -5);
          ctx.lineTo(-SHIP_SIZE * 0.9 - Math.random() * 8, 0);
          ctx.lineTo(-SHIP_SIZE * 0.4, 5);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // HUD
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 20px "Chakra Petch", monospace';
      ctx.fillText(`SCORE: ${s.score}`, 16, 32);

      // Overlays
      if (!s.running && !s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 40px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ASTEROIDS', W / 2, H / 2 - 50);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px "Exo 2", sans-serif';
        ctx.fillText('← → Rotate  |  ↑ Thrust  |  SPACE Shoot', W / 2, H / 2);
        ctx.fillText('Press SPACE to start', W / 2, H / 2 + 35);
        ctx.textAlign = 'left';
      }

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 44px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
        ctx.fillStyle = '#f97316';
        ctx.font = '24px "Chakra Petch", monospace';
        ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 20);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px "Exo 2", sans-serif';
        ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 60);
        ctx.textAlign = 'left';
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (thrustStopRef.current) { thrustStopRef.current(); thrustStopRef.current = null; }
    };
  }, [playLaser, playLargeExplosion, playSmallExplosion, startThrust, playShipExplosion]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-6 mb-2">
        <span className="font-chakra text-neon-orange text-lg font-bold">ASTEROIDS</span>
        <span className="font-chakra text-neon-cyan text-lg">Score: {displayScore}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-neon-orange/30 max-w-full"
        tabIndex={0}
        onFocus={() => { /* focus handler */ }}
      />
      <div className="text-muted-foreground text-sm font-exo text-center">
        <kbd className="bg-muted px-1 rounded">←</kbd><kbd className="bg-muted px-1 rounded">→</kbd> Rotate &nbsp;|&nbsp;
        <kbd className="bg-muted px-1 rounded">↑</kbd> Thrust &nbsp;|&nbsp;
        <kbd className="bg-muted px-1 rounded">SPACE</kbd> Shoot / Start
      </div>
    </div>
  );
}
