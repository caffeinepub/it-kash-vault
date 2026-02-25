import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type GamePhase = 'idle' | 'player-turn' | 'ai-turn' | 'animating' | 'victory' | 'defeat';
type PlayerAction = 'attack' | 'block' | 'special';
type CombatLog = { text: string; color: string };

interface Gladiator {
  hp: number;
  maxHp: number;
  isBlocking: boolean;
  shakeTimer: number;
  flashTimer: number;
  flashColor: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PLAYER_MAX_HP = 120;
const ENEMY_MAX_HP = 100;
const CANVAS_W = 800;
const CANVAS_H = 400;

// ── Helpers ────────────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcDamage(base: number, variance: number, targetBlocking: boolean): number {
  const raw = rand(base - variance, base + variance);
  return targetBlocking ? Math.max(1, Math.floor(raw * 0.25)) : raw;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function SwordsAndSandalsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Images
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const enemyImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef(0);

  // Game state (refs for render loop)
  const playerRef = useRef<Gladiator>({ hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, isBlocking: false, shakeTimer: 0, flashTimer: 0, flashColor: '' });
  const enemyRef = useRef<Gladiator>({ hp: ENEMY_MAX_HP, maxHp: ENEMY_MAX_HP, isBlocking: false, shakeTimer: 0, flashTimer: 0, flashColor: '' });
  const roundRef = useRef(1);
  const phaseRef = useRef<GamePhase>('player-turn');
  const logsRef = useRef<CombatLog[]>([]);

  // React state for UI re-renders
  const [phase, setPhase] = useState<GamePhase>('player-turn');
  const [round, setRound] = useState(1);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX_HP);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [isActing, setIsActing] = useState(false);

  // ── Image loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    const total = 3;
    const onLoad = () => {
      imagesLoadedRef.current += 1;
    };

    const bg = new Image();
    bg.src = '/assets/generated/swords-sandals-bg.dim_800x400.png';
    bg.onload = onLoad;
    bgImgRef.current = bg;

    const player = new Image();
    player.src = '/assets/generated/gladiator-player.dim_128x256.png';
    player.onload = onLoad;
    playerImgRef.current = player;

    const enemy = new Image();
    enemy.src = '/assets/generated/gladiator-enemy.dim_128x256.png';
    enemy.onload = onLoad;
    enemyImgRef.current = enemy;

    return () => {
      bg.onload = null;
      player.onload = null;
      enemy.onload = null;
    };
  }, []);

  // ── Canvas render loop ───────────────────────────────────────────────────────
  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    // Tick shake/flash timers
    const p = playerRef.current;
    const e = enemyRef.current;
    if (p.shakeTimer > 0) p.shakeTimer = Math.max(0, p.shakeTimer - dt);
    if (e.shakeTimer > 0) e.shakeTimer = Math.max(0, e.shakeTimer - dt);
    if (p.flashTimer > 0) p.flashTimer = Math.max(0, p.flashTimer - dt);
    if (e.flashTimer > 0) e.flashTimer = Math.max(0, e.flashTimer - dt);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    if (bgImgRef.current && bgImgRef.current.complete) {
      ctx.drawImage(bgImgRef.current, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      // Fallback gradient arena
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#0a0a1a');
      grad.addColorStop(0.6, '#1a0a0a');
      grad.addColorStop(1, '#2a1a00');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Sand floor
      ctx.fillStyle = '#3d2b1a';
      ctx.fillRect(0, CANVAS_H * 0.72, CANVAS_W, CANVAS_H * 0.28);

      // Arena lines
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H * 0.72 + i * 20);
        ctx.lineTo(CANVAS_W, CANVAS_H * 0.72 + i * 20);
        ctx.stroke();
      }
    }

    // Vignette overlay
    const vignette = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.3, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Draw gladiators ──────────────────────────────────────────────────────
    const groundY = CANVAS_H * 0.72;
    const spriteH = 180;
    const spriteW = 90;

    // Player (left side)
    const pShakeX = p.shakeTimer > 0 ? Math.sin(p.shakeTimer * 60) * 6 : 0;
    const pX = 120 + pShakeX;
    const pY = groundY - spriteH;

    ctx.save();
    if (p.flashTimer > 0) {
      ctx.globalAlpha = 0.85;
    }
    if (playerImgRef.current && playerImgRef.current.complete) {
      ctx.drawImage(playerImgRef.current, pX - spriteW / 2, pY, spriteW, spriteH);
    } else {
      drawFallbackGladiator(ctx, pX, pY, spriteW, spriteH, '#39ff14', p.isBlocking);
    }
    if (p.flashTimer > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = p.flashColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(pX - spriteW / 2, pY, spriteW, spriteH);
    }
    ctx.restore();

    // Blocking shield glow for player
    if (p.isBlocking) {
      ctx.save();
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 3;
      ctx.strokeRect(pX - spriteW / 2 - 4, pY - 4, spriteW + 8, spriteH + 8);
      ctx.restore();
    }

    // Enemy (right side)
    const eShakeX = e.shakeTimer > 0 ? Math.sin(e.shakeTimer * 60) * 6 : 0;
    const eX = CANVAS_W - 120 + eShakeX;
    const eY = groundY - spriteH;

    ctx.save();
    if (e.flashTimer > 0) {
      ctx.globalAlpha = 0.85;
    }
    if (enemyImgRef.current && enemyImgRef.current.complete) {
      // Flip enemy to face left
      ctx.translate(eX + spriteW / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(enemyImgRef.current, 0, eY, spriteW, spriteH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      drawFallbackGladiator(ctx, eX, eY, spriteW, spriteH, '#ff2d55', e.isBlocking);
    }
    if (e.flashTimer > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = e.flashColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(eX - spriteW / 2, eY, spriteW, spriteH);
    }
    ctx.restore();

    // Blocking shield glow for enemy
    if (e.isBlocking) {
      ctx.save();
      ctx.shadowColor = '#ff2d55';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = 3;
      ctx.strokeRect(eX - spriteW / 2 - 4, eY - 4, spriteW + 8, spriteH + 8);
      ctx.restore();
    }

    // ── Health bars ──────────────────────────────────────────────────────────
    drawHealthBar(ctx, 60, 20, 200, 22, p.hp, p.maxHp, '#39ff14', 'PLAYER');
    drawHealthBar(ctx, CANVAS_W - 260, 20, 200, 22, e.hp, e.maxHp, '#ff2d55', 'ENEMY');

    // ── Round counter ────────────────────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 18px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 12;
    ctx.fillText(`ROUND ${roundRef.current}`, CANVAS_W / 2, 36);
    ctx.restore();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── Combat logic ─────────────────────────────────────────────────────────────
  const addLog = useCallback((text: string, color: string) => {
    logsRef.current = [{ text, color }, ...logsRef.current].slice(0, 6);
    setLogs([...logsRef.current]);
  }, []);

  const syncState = useCallback(() => {
    setPlayerHp(playerRef.current.hp);
    setEnemyHp(enemyRef.current.hp);
    setRound(roundRef.current);
  }, []);

  const checkGameOver = useCallback((): boolean => {
    if (enemyRef.current.hp <= 0) {
      phaseRef.current = 'victory';
      setPhase('victory');
      return true;
    }
    if (playerRef.current.hp <= 0) {
      phaseRef.current = 'defeat';
      setPhase('defeat');
      return true;
    }
    return false;
  }, []);

  const doAiTurn = useCallback(() => {
    const aiActions: PlayerAction[] = ['attack', 'attack', 'attack', 'block', 'special'];
    const action = aiActions[rand(0, aiActions.length - 1)];
    const e = enemyRef.current;
    const p = playerRef.current;

    e.isBlocking = false;

    if (action === 'block') {
      e.isBlocking = true;
      addLog('Enemy raises their shield! 🛡️', '#ff2d55');
    } else if (action === 'special') {
      const dmg = calcDamage(22, 8, p.isBlocking);
      p.hp = Math.max(0, p.hp - dmg);
      p.shakeTimer = 0.4;
      p.flashTimer = 0.3;
      p.flashColor = '#ff2d55';
      addLog(`Enemy unleashes a FURY STRIKE! -${dmg} HP ⚡`, '#ff2d55');
    } else {
      const dmg = calcDamage(14, 5, p.isBlocking);
      p.hp = Math.max(0, p.hp - dmg);
      p.shakeTimer = 0.3;
      p.flashTimer = 0.25;
      p.flashColor = '#ff6b6b';
      const blocked = p.isBlocking ? ' (blocked!)' : '';
      addLog(`Enemy attacks for ${dmg} damage!${blocked} ⚔️`, '#ff8888');
    }

    p.isBlocking = false;
    syncState();

    if (!checkGameOver()) {
      roundRef.current += 1;
      syncState();
      phaseRef.current = 'player-turn';
      setPhase('player-turn');
    }

    setIsActing(false);
  }, [addLog, syncState, checkGameOver]);

  const handlePlayerAction = useCallback((action: PlayerAction) => {
    if (phaseRef.current !== 'player-turn' || isActing) return;

    setIsActing(true);
    phaseRef.current = 'animating';
    setPhase('animating');

    const p = playerRef.current;
    const e = enemyRef.current;

    p.isBlocking = false;

    if (action === 'block') {
      p.isBlocking = true;
      addLog('You raise your shield! 🛡️', '#39ff14');
    } else if (action === 'special') {
      const dmg = calcDamage(25, 10, e.isBlocking);
      e.hp = Math.max(0, e.hp - dmg);
      e.shakeTimer = 0.5;
      e.flashTimer = 0.35;
      e.flashColor = '#ff2d55';
      addLog(`You unleash a POWER STRIKE! -${dmg} HP ⚡`, '#ffe066');
    } else {
      const dmg = calcDamage(15, 6, e.isBlocking);
      e.hp = Math.max(0, e.hp - dmg);
      e.shakeTimer = 0.35;
      e.flashTimer = 0.25;
      e.flashColor = '#ff6b6b';
      const blocked = e.isBlocking ? ' (blocked!)' : '';
      addLog(`You attack for ${dmg} damage!${blocked} ⚔️`, '#39ff14');
    }

    syncState();

    if (checkGameOver()) {
      setIsActing(false);
      return;
    }

    // AI takes its turn after a short delay
    setTimeout(() => {
      doAiTurn();
    }, 900);
  }, [isActing, addLog, syncState, checkGameOver, doAiTurn]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    playerRef.current = { hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, isBlocking: false, shakeTimer: 0, flashTimer: 0, flashColor: '' };
    enemyRef.current = { hp: ENEMY_MAX_HP, maxHp: ENEMY_MAX_HP, isBlocking: false, shakeTimer: 0, flashTimer: 0, flashColor: '' };
    roundRef.current = 1;
    phaseRef.current = 'player-turn';
    logsRef.current = [];
    setPhase('player-turn');
    setRound(1);
    setPlayerHp(PLAYER_MAX_HP);
    setEnemyHp(ENEMY_MAX_HP);
    setLogs([]);
    setIsActing(false);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isPlayerTurn = phase === 'player-turn';
  const buttonsDisabled = !isPlayerTurn || isActing;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Canvas arena */}
      <div className="relative w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-lg border border-neon-yellow/30 shadow-[0_0_30px_rgba(255,224,102,0.15)]"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Victory overlay */}
        {phase === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <p className="font-orbitron text-5xl font-black neon-text-green animate-pulse">VICTORY!</p>
              <p className="font-rajdhani text-xl text-neon-yellow tracking-widest">The crowd roars for you, Champion!</p>
              <button
                onClick={resetGame}
                className="mt-4 px-8 py-3 font-orbitron font-bold text-sm tracking-widest bg-neon-green/20 border-2 border-neon-green text-neon-green rounded hover:bg-neon-green/40 transition-all shadow-[0_0_20px_rgba(57,255,20,0.4)]"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Defeat overlay */}
        {phase === 'defeat' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/75 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <p className="font-orbitron text-5xl font-black neon-text-pink animate-pulse">DEFEATED!</p>
              <p className="font-rajdhani text-xl text-muted-foreground tracking-widest">You have fallen in the arena...</p>
              <button
                onClick={resetGame}
                className="mt-4 px-8 py-3 font-orbitron font-bold text-sm tracking-widest bg-neon-pink/20 border-2 border-neon-pink text-neon-pink rounded hover:bg-neon-pink/40 transition-all shadow-[0_0_20px_rgba(255,45,85,0.4)]"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* AI turn indicator */}
        {phase === 'animating' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <p className="font-orbitron text-lg font-bold text-neon-yellow animate-pulse tracking-widest drop-shadow-lg">
              ENEMY THINKING...
            </p>
          </div>
        )}
      </div>

      {/* HUD row */}
      <div className="w-full max-w-[800px] grid grid-cols-3 gap-3 items-center">
        {/* Player HP */}
        <div className="space-y-1">
          <div className="flex justify-between font-rajdhani text-xs tracking-widest text-neon-green">
            <span>PLAYER</span>
            <span>{playerHp} / {PLAYER_MAX_HP}</span>
          </div>
          <div className="h-3 bg-black/60 rounded-full border border-neon-green/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(playerHp / PLAYER_MAX_HP) * 100}%`,
                background: 'linear-gradient(90deg, #39ff14, #00ff88)',
                boxShadow: '0 0 8px #39ff14',
              }}
            />
          </div>
        </div>

        {/* Round */}
        <div className="text-center">
          <p className="font-orbitron text-xs text-muted-foreground tracking-widest">ROUND</p>
          <p className="font-orbitron text-2xl font-black text-neon-yellow" style={{ textShadow: '0 0 12px #ffe066' }}>
            {round}
          </p>
        </div>

        {/* Enemy HP */}
        <div className="space-y-1">
          <div className="flex justify-between font-rajdhani text-xs tracking-widest text-neon-pink">
            <span>{enemyHp} / {ENEMY_MAX_HP}</span>
            <span>ENEMY</span>
          </div>
          <div className="h-3 bg-black/60 rounded-full border border-neon-pink/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ml-auto"
              style={{
                width: `${(enemyHp / ENEMY_MAX_HP) * 100}%`,
                background: 'linear-gradient(90deg, #ff2d55, #ff6b6b)',
                boxShadow: '0 0 8px #ff2d55',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-[800px] grid grid-cols-3 gap-3">
        <ActionButton
          label="⚔️ ATTACK"
          sublabel="15–21 dmg"
          color="neon-green"
          disabled={buttonsDisabled}
          onClick={() => handlePlayerAction('attack')}
        />
        <ActionButton
          label="🛡️ BLOCK"
          sublabel="Reduce dmg 75%"
          color="neon-cyan"
          disabled={buttonsDisabled}
          onClick={() => handlePlayerAction('block')}
        />
        <ActionButton
          label="⚡ SPECIAL"
          sublabel="15–35 dmg"
          color="neon-yellow"
          disabled={buttonsDisabled}
          onClick={() => handlePlayerAction('special')}
        />
      </div>

      {/* Combat log */}
      <div className="w-full max-w-[800px] bg-black/50 border border-white/10 rounded-lg p-3 min-h-[100px]">
        <p className="font-orbitron text-xs text-muted-foreground tracking-widest mb-2">COMBAT LOG</p>
        <div className="space-y-1">
          {logs.length === 0 && (
            <p className="font-rajdhani text-sm text-muted-foreground italic">The battle begins... Choose your action!</p>
          )}
          {logs.map((log, i) => (
            <p
              key={i}
              className="font-rajdhani text-sm tracking-wide"
              style={{ color: log.color, opacity: 1 - i * 0.15 }}
            >
              {log.text}
            </p>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-[800px] bg-black/30 border border-white/5 rounded-lg p-3">
        <p className="font-orbitron text-xs text-muted-foreground tracking-widest mb-2">HOW TO PLAY</p>
        <div className="grid grid-cols-3 gap-2 font-rajdhani text-xs text-muted-foreground">
          <p>⚔️ <span className="text-neon-green">Attack</span> — Deal moderate damage to the enemy</p>
          <p>🛡️ <span className="text-neon-cyan">Block</span> — Reduce incoming damage by 75% this round</p>
          <p>⚡ <span className="text-neon-yellow">Special</span> — High-risk, high-reward power strike</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
interface ActionButtonProps {
  label: string;
  sublabel: string;
  color: 'neon-green' | 'neon-cyan' | 'neon-yellow' | 'neon-pink';
  disabled: boolean;
  onClick: () => void;
}

const COLOR_MAP: Record<string, { border: string; text: string; bg: string; shadow: string }> = {
  'neon-green': { border: '#39ff14', text: '#39ff14', bg: 'rgba(57,255,20,0.12)', shadow: '0 0 16px rgba(57,255,20,0.35)' },
  'neon-cyan': { border: '#00f5ff', text: '#00f5ff', bg: 'rgba(0,245,255,0.12)', shadow: '0 0 16px rgba(0,245,255,0.35)' },
  'neon-yellow': { border: '#ffe066', text: '#ffe066', bg: 'rgba(255,224,102,0.12)', shadow: '0 0 16px rgba(255,224,102,0.35)' },
  'neon-pink': { border: '#ff2d55', text: '#ff2d55', bg: 'rgba(255,45,85,0.12)', shadow: '0 0 16px rgba(255,45,85,0.35)' },
};

function ActionButton({ label, sublabel, color, disabled, onClick }: ActionButtonProps) {
  const c = COLOR_MAP[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center py-3 px-2 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      style={{
        border: `2px solid ${c.border}`,
        color: c.text,
        background: c.bg,
        boxShadow: disabled ? 'none' : c.shadow,
      }}
    >
      <span>{label}</span>
      <span className="font-rajdhani text-xs font-normal opacity-70 mt-0.5">{sublabel}</span>
    </button>
  );
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  hp: number, maxHp: number,
  color: string,
  label: string
) {
  const pct = Math.max(0, hp / maxHp);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  // Fill
  if (pct > 0) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, (w - 4) * pct, h - 4, 3);
    ctx.fill();
    ctx.restore();
  }

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Label
  ctx.font = 'bold 10px Rajdhani, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = label === 'PLAYER' ? 'left' : 'right';
  ctx.fillText(`${label}  ${hp}/${maxHp}`, label === 'PLAYER' ? x : x + w, y - 4);
}

function drawFallbackGladiator(
  ctx: CanvasRenderingContext2D,
  cx: number, y: number, w: number, h: number,
  color: string,
  blocking: boolean
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  // Body
  ctx.fillRect(cx - w * 0.2, y + h * 0.3, w * 0.4, h * 0.45);
  // Head
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.15, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Legs
  ctx.fillRect(cx - w * 0.18, y + h * 0.75, w * 0.15, h * 0.25);
  ctx.fillRect(cx + w * 0.03, y + h * 0.75, w * 0.15, h * 0.25);
  // Sword arm
  if (!blocking) {
    ctx.fillRect(cx + w * 0.2, y + h * 0.3, w * 0.35, h * 0.08);
  }
  // Shield
  if (blocking) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - w * 0.45, y + h * 0.25, w * 0.2, h * 0.4);
  }
  ctx.restore();
}
