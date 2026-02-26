import React, { useRef, useEffect, useState, useCallback } from 'react';

const CW = 700;
const CH = 500;

interface Vec2 { x: number; y: number; }
interface Asteroid { x: number; y: number; vx: number; vy: number; r: number; size: 'large' | 'medium' | 'small'; angle: number; spin: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }
interface Ship { x: number; y: number; vx: number; vy: number; angle: number; thrusting: boolean; }

interface AstState {
  running: boolean;
  over: boolean;
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  score: number;
  keys: Set<string>;
  shootCooldown: number;
  invincible: number;
  frame: number;
}

function makeShip(): Ship {
  return { x: CW / 2, y: CH / 2, vx: 0, vy: 0, angle: -Math.PI / 2, thrusting: false };
}

function makeAsteroid(size: 'large' | 'medium' | 'small', x?: number, y?: number): Asteroid {
  const r = size === 'large' ? 45 : size === 'medium' ? 25 : 12;
  const speed = size === 'large' ? 1.2 : size === 'medium' ? 2 : 3;
  const angle = Math.random() * Math.PI * 2;
  const px = x ?? (Math.random() < 0.5 ? Math.random() * 100 : CW - Math.random() * 100);
  const py = y ?? (Math.random() < 0.5 ? Math.random() * 100 : CH - Math.random() * 100);
  return {
    x: px, y: py,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r, size,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.04,
  };
}

function makeInitialState(): AstState {
  return {
    running: false,
    over: false,
    ship: makeShip(),
    asteroids: Array.from({ length: 5 }, () => makeAsteroid('large')),
    bullets: [],
    score: 0,
    keys: new Set(),
    shootCooldown: 0,
    invincible: 0,
    frame: 0,
  };
}

function wrap(v: number, max: number) { return ((v % max) + max) % max; }

function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.angle);
  ctx.strokeStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pts = 8;
  for (let i = 0; i < pts; i++) {
    const ang = (i / pts) * Math.PI * 2;
    const jitter = a.r * (0.75 + Math.sin(i * 3.7 + a.angle * 2) * 0.25);
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
  ctx.restore();
}

export default function AsteroidsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<AstState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'over'>('idle');
  const [bestScore, setBestScore] = useState(0);

  const startGame = useCallback(() => {
    const s = makeInitialState();
    s.running = true;
    s.invincible = 120;
    stateRef.current = s;
    setDisplayScore(0);
    setGameStatus('playing');
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    if (s.running && !s.over) {
      s.frame++;
      const ship = s.ship;

      // Rotate
      if (s.keys.has('ArrowLeft')) ship.angle -= 0.06;
      if (s.keys.has('ArrowRight')) ship.angle += 0.06;

      // Thrust
      ship.thrusting = s.keys.has('ArrowUp');
      if (ship.thrusting) {
        ship.vx += Math.cos(ship.angle) * 0.25;
        ship.vy += Math.sin(ship.angle) * 0.25;
      }

      // Friction
      ship.vx *= 0.98;
      ship.vy *= 0.98;
      const maxSpeed = 8;
      const spd = Math.hypot(ship.vx, ship.vy);
      if (spd > maxSpeed) { ship.vx = (ship.vx / spd) * maxSpeed; ship.vy = (ship.vy / spd) * maxSpeed; }

      ship.x = wrap(ship.x + ship.vx, CW);
      ship.y = wrap(ship.y + ship.vy, CH);

      // Shoot
      if (s.keys.has(' ') && s.shootCooldown <= 0) {
        s.bullets.push({
          x: ship.x + Math.cos(ship.angle) * 20,
          y: ship.y + Math.sin(ship.angle) * 20,
          vx: Math.cos(ship.angle) * 12 + ship.vx,
          vy: Math.sin(ship.angle) * 12 + ship.vy,
          life: 55,
        });
        s.shootCooldown = 12;
      }
      if (s.shootCooldown > 0) s.shootCooldown--;

      // Move bullets
      s.bullets = s.bullets
        .map((b) => ({ ...b, x: wrap(b.x + b.vx, CW), y: wrap(b.y + b.vy, CH), life: b.life - 1 }))
        .filter((b) => b.life > 0);

      // Move asteroids
      s.asteroids = s.asteroids.map((a) => ({
        ...a,
        x: wrap(a.x + a.vx, CW),
        y: wrap(a.y + a.vy, CH),
        angle: a.angle + a.spin,
      }));

      // Bullet-asteroid collision
      const newAsteroids: Asteroid[] = [];
      const hitBullets = new Set<number>();
      for (const a of s.asteroids) {
        let hit = false;
        for (let bi = 0; bi < s.bullets.length; bi++) {
          if (hitBullets.has(bi)) continue;
          if (dist(s.bullets[bi], a) < a.r) {
            hit = true;
            hitBullets.add(bi);
            if (a.size === 'large') {
              s.score += 20;
              newAsteroids.push(makeAsteroid('medium', a.x, a.y));
              newAsteroids.push(makeAsteroid('medium', a.x, a.y));
            } else if (a.size === 'medium') {
              s.score += 50;
              newAsteroids.push(makeAsteroid('small', a.x, a.y));
              newAsteroids.push(makeAsteroid('small', a.x, a.y));
            } else {
              s.score += 100;
            }
            break;
          }
        }
        if (!hit) newAsteroids.push(a);
      }
      s.bullets = s.bullets.filter((_, i) => !hitBullets.has(i));
      s.asteroids = newAsteroids;

      // Spawn more if cleared
      if (s.asteroids.length === 0) {
        for (let i = 0; i < 5; i++) s.asteroids.push(makeAsteroid('large'));
      }

      // Ship-asteroid collision
      if (s.invincible > 0) {
        s.invincible--;
      } else {
        for (const a of s.asteroids) {
          if (dist(ship, a) < a.r - 4) {
            s.over = true;
            s.running = false;
            setBestScore((prev) => Math.max(prev, s.score));
            setGameStatus('over');
            break;
          }
        }
      }

      if (s.frame % 4 === 0) setDisplayScore(s.score);
    }

    // Draw
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, CW, CH);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 60; i++) {
      ctx.fillRect((i * 137) % CW, (i * 97) % CH, 1, 1);
    }

    // Asteroids
    for (const a of stateRef.current.asteroids) drawAsteroid(ctx, a);

    // Bullets
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 10;
    for (const b of stateRef.current.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Ship
    const ship = stateRef.current.ship;
    if (!stateRef.current.over && (stateRef.current.invincible % 6 < 4 || stateRef.current.invincible === 0)) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = '#ff6a00';
      ctx.shadowColor = '#ff6a00';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.stroke();

      if (ship.thrusting) {
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-18 - Math.random() * 8, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Score
    ctx.fillStyle = '#ff6a00';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 18px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${stateRef.current.score}`, 16, 30);
    ctx.shadowBlur = 0;

    if (!stateRef.current.running && !stateRef.current.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#ff6a00';
      ctx.font = 'bold 22px "Chakra Petch", sans-serif';
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
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
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
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Asteroids</h2>
        <p className="font-exo text-muted-foreground text-sm">Destroy all asteroids to survive!</p>
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
        width={CW}
        height={CH}
        onClick={() => { if (!stateRef.current.running && !stateRef.current.over) startGame(); }}
        className="rounded-xl border border-border cursor-pointer w-full"
        style={{ maxWidth: CW }}
        tabIndex={0}
      />

      {gameStatus === 'over' && (
        <div className="text-center bg-card border border-neon-orange/40 rounded-xl p-6 w-full max-w-xs">
          <div className="font-chakra text-2xl font-black neon-text-pink mb-2">Ship Destroyed!</div>
          <div className="font-exo text-muted-foreground mb-1">Final Score</div>
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

      {gameStatus === 'idle' && (
        <button
          onClick={startGame}
          className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
        >
          Start Game
        </button>
      )}

      <div className="font-exo text-xs text-muted-foreground text-center">
        ← → Rotate • ↑ Thrust • Space Shoot • Large→2 Medium→2 Small→Destroyed
      </div>
    </div>
  );
}
