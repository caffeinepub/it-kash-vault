import { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Obstacle {
  x: number;
  type: 'spike' | 'platform';
  width: number;
  height: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;
const CUBE_SIZE = 36;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const INITIAL_SPEED = 4;

export default function GeometryDashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    running: false,
    dead: false,
    score: 0,
    speed: INITIAL_SPEED,
    cubeY: GROUND_Y - CUBE_SIZE,
    cubeVY: 0,
    cubeRotation: 0,
    onGround: true,
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    frameCount: 0,
    nextObstacleIn: 80,
  });
  const animFrameRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const spawnParticles = useCallback((x: number, y: number) => {
    const colors = ['#39ff14', '#00f5ff', '#ff2d78', '#ffe600'];
    for (let i = 0; i < 8; i++) {
      gameStateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -5 - 2,
        life: 30,
        maxLife: 30,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const jump = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.running || state.dead) return;
    if (state.onGround) {
      state.cubeVY = JUMP_FORCE;
      state.onGround = false;
      spawnParticles(80 + CUBE_SIZE / 2, state.cubeY + CUBE_SIZE);
    }
  }, [spawnParticles]);

  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    state.running = true;
    state.dead = false;
    state.score = 0;
    state.speed = INITIAL_SPEED;
    state.cubeY = GROUND_Y - CUBE_SIZE;
    state.cubeVY = 0;
    state.cubeRotation = 0;
    state.onGround = true;
    state.obstacles = [];
    state.particles = [];
    state.frameCount = 0;
    state.nextObstacleIn = 80;
    setDisplayScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid lines
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Ground
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Obstacles
    for (const obs of state.obstacles) {
      if (obs.type === 'spike') {
        ctx.fillStyle = '#ff2d78';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, GROUND_Y - obs.height);
        ctx.lineTo(obs.x, GROUND_Y);
        ctx.lineTo(obs.x + obs.width, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#00f5ff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(obs.x, GROUND_Y - obs.height, obs.width, obs.height);
        ctx.shadowBlur = 0;
      }
    }

    // Cube
    const cubeX = 80;
    ctx.save();
    ctx.translate(cubeX + CUBE_SIZE / 2, state.cubeY + CUBE_SIZE / 2);
    ctx.rotate((state.cubeRotation * Math.PI) / 180);
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 15;
    ctx.fillRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
    // Inner design
    ctx.fillStyle = '#00f5ff';
    ctx.shadowBlur = 0;
    ctx.fillRect(-CUBE_SIZE / 4, -CUBE_SIZE / 4, CUBE_SIZE / 2, CUBE_SIZE / 2);
    ctx.restore();

    // Particles
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Score
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 20px Orbitron, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${Math.floor(state.score)}`, 20, 40);
    ctx.shadowBlur = 0;

    // Speed indicator
    ctx.fillStyle = '#00f5ff';
    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillText(`SPEED: ${state.speed.toFixed(1)}x`, 20, 65);
  }, []);

  const gameLoop = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.running || state.dead) return;

    state.frameCount++;
    state.score += state.speed * 0.1;
    state.speed = INITIAL_SPEED + state.score * 0.002;

    // Physics
    state.cubeVY += GRAVITY;
    state.cubeY += state.cubeVY;

    if (state.cubeY >= GROUND_Y - CUBE_SIZE) {
      state.cubeY = GROUND_Y - CUBE_SIZE;
      state.cubeVY = 0;
      state.onGround = true;
    } else {
      state.onGround = false;
    }

    if (!state.onGround) {
      state.cubeRotation += state.speed * 3;
    }

    // Spawn obstacles
    state.nextObstacleIn--;
    if (state.nextObstacleIn <= 0) {
      const type = Math.random() < 0.6 ? 'spike' : 'platform';
      const height = type === 'spike' ? 30 + Math.random() * 20 : 20 + Math.random() * 30;
      state.obstacles.push({
        x: CANVAS_WIDTH + 20,
        type,
        width: type === 'spike' ? 30 : 40,
        height,
      });
      state.nextObstacleIn = 60 + Math.random() * 80;
    }

    // Move obstacles
    for (const obs of state.obstacles) {
      obs.x -= state.speed;
    }
    state.obstacles = state.obstacles.filter((o) => o.x > -100);

    // Collision detection
    const cubeX = 80;
    for (const obs of state.obstacles) {
      if (obs.type === 'spike') {
        const spikeLeft = obs.x;
        const spikeRight = obs.x + obs.width;
        const spikeTop = GROUND_Y - obs.height;
        if (
          cubeX + CUBE_SIZE - 4 > spikeLeft + 4 &&
          cubeX + 4 < spikeRight - 4 &&
          state.cubeY + CUBE_SIZE - 4 > spikeTop + 4
        ) {
          state.dead = true;
          state.running = false;
          setDisplayScore(Math.floor(state.score));
          setGameOver(true);
          return;
        }
      } else {
        const platLeft = obs.x;
        const platRight = obs.x + obs.width;
        const platTop = GROUND_Y - obs.height;
        if (
          cubeX + CUBE_SIZE - 4 > platLeft &&
          cubeX + 4 < platRight &&
          state.cubeY + CUBE_SIZE > platTop &&
          state.cubeY < platTop + 10
        ) {
          state.dead = true;
          state.running = false;
          setDisplayScore(Math.floor(state.score));
          setGameOver(true);
          return;
        }
      }
    }

    // Update particles
    for (const p of state.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life--;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    setDisplayScore(Math.floor(state.score));
    draw();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!started || gameOver) {
          startGame();
        } else {
          jump();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump, startGame, started, gameOver]);

  useEffect(() => {
    if (started && !gameOver) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [started, gameOver, gameLoop]);

  const handleCanvasClick = () => {
    if (!started || gameOver) {
      startGame();
    } else {
      jump();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="border border-neon-green/30 rounded-lg cursor-pointer max-w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-green mb-4">GD RUNNER</h2>
            <p className="font-rajdhani text-muted-foreground mb-6 text-center px-8">
              Jump over spikes and platforms! Click or press SPACE to jump.
            </p>
            <button
              onClick={startGame}
              className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-green text-background px-8 py-3 rounded-lg shadow-neon-green-sm hover:shadow-neon-green transition-all duration-300"
            >
              Start Game
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 rounded-lg">
            <h2 className="font-orbitron text-3xl font-black neon-text-pink mb-2">GAME OVER</h2>
            <p className="font-rajdhani text-xl text-muted-foreground mb-1">Final Score</p>
            <p className="font-orbitron text-4xl font-black neon-text-green mb-6">{displayScore}</p>
            <button
              onClick={startGame}
              className="font-orbitron font-bold text-sm uppercase tracking-widest bg-neon-green text-background px-8 py-3 rounded-lg shadow-neon-green-sm hover:shadow-neon-green transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-8 text-center">
        <div>
          <p className="font-rajdhani text-muted-foreground text-xs uppercase tracking-widest">Score</p>
          <p className="font-orbitron text-xl font-bold neon-text-green">{displayScore}</p>
        </div>
      </div>
      <p className="font-rajdhani text-muted-foreground text-sm">Click or press SPACE / ↑ to jump</p>
    </div>
  );
}
