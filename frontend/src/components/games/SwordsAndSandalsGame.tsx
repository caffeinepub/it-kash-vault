import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type GamePhase = 'player-turn' | 'enemy-turn' | 'animating' | 'victory' | 'defeat';

interface CombatantState {
  hp: number;
  maxHp: number;
  isBlocking: boolean;
  specialCooldown: number;
}

interface LogEntry {
  text: string;
  color: string;
}

interface ShakeState {
  target: 'player' | 'enemy' | null;
  frames: number;
}

interface FlashState {
  target: 'player' | 'enemy' | null;
  frames: number;
  color: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 420;
const MAX_HP = 100;
const SPECIAL_COOLDOWN_TURNS = 3;

const NEON_ORANGE = '#ff6b35';
const NEON_CYAN = '#00d9ff';
const NEON_RED = '#ff3355';
const NEON_GREEN = '#39ff14';
const NEON_YELLOW = '#ffe600';
const BG_DARK = '#0a0a0a';

// ── Helpers ────────────────────────────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
void slugify; // suppress unused warning

// ── Component ──────────────────────────────────────────────────────────────────
export default function SwordsAndSandalsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const enemyImgRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef(0);

  // Game state refs (for render loop)
  const playerRef = useRef<CombatantState>({ hp: MAX_HP, maxHp: MAX_HP, isBlocking: false, specialCooldown: 0 });
  const enemyRef = useRef<CombatantState>({ hp: MAX_HP, maxHp: MAX_HP, isBlocking: false, specialCooldown: 0 });
  const roundRef = useRef(1);
  const phaseRef = useRef<GamePhase>('player-turn');
  const logRef = useRef<LogEntry[]>([]);
  const shakeRef = useRef<ShakeState>({ target: null, frames: 0 });
  const flashRef = useRef<FlashState>({ target: null, frames: 0, color: NEON_RED });

  // React state for UI re-renders
  const [phase, setPhase] = useState<GamePhase>('player-turn');
  const [round, setRound] = useState(1);
  const [playerHp, setPlayerHp] = useState(MAX_HP);
  const [enemyHp, setEnemyHp] = useState(MAX_HP);
  const [playerSpecialCd, setPlayerSpecialCd] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [imagesReady, setImagesReady] = useState(false);

  // ── Image loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    const total = 3;
    const onLoad = () => {
      imagesLoadedRef.current += 1;
      if (imagesLoadedRef.current >= total) setImagesReady(true);
    };

    const bg = new Image();
    bg.src = '/assets/generated/swords-sandals-bg.dim_800x400.png';
    bg.onload = onLoad;
    bg.onerror = onLoad; // still proceed even if missing
    bgImgRef.current = bg;

    const player = new Image();
    player.src = '/assets/generated/gladiator-player.dim_128x256.png';
    player.onload = onLoad;
    player.onerror = onLoad;
    playerImgRef.current = player;

    const enemy = new Image();
    enemy.src = '/assets/generated/gladiator-enemy.dim_128x256.png';
    enemy.onload = onLoad;
    enemy.onerror = onLoad;
    enemyImgRef.current = enemy;
  }, []);

  // ── Canvas render loop ───────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const enemy = enemyRef.current;
    const shake = shakeRef.current;
    const flash = flashRef.current;

    // Background
    if (bgImgRef.current && bgImgRef.current.complete && bgImgRef.current.naturalWidth > 0) {
      ctx.drawImage(bgImgRef.current, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      // Fallback sandy arena
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#1a0a00');
      grad.addColorStop(0.6, '#3d1f00');
      grad.addColorStop(1, '#5c3000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Sand floor
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(0, CANVAS_H - 80, CANVAS_W, 80);
      ctx.fillStyle = '#a07820';
      ctx.fillRect(0, CANVAS_H - 82, CANVAS_W, 4);
    }

    // Dark overlay for readability
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Draw gladiators ──────────────────────────────────────────────────────
    const GROUND_Y = CANVAS_H - 80;
    const SPRITE_H = 160;
    const SPRITE_W = 80;

    // Player position (left side)
    let px = 140;
    let py = GROUND_Y - SPRITE_H;
    if (shake.target === 'player' && shake.frames > 0) {
      px += Math.sin(shake.frames * 1.8) * 8;
    }

    // Enemy position (right side)
    let ex = CANVAS_W - 140 - SPRITE_W;
    let ey = GROUND_Y - SPRITE_H;
    if (shake.target === 'enemy' && shake.frames > 0) {
      ex += Math.sin(shake.frames * 1.8) * 8;
    }

    // Draw player sprite or fallback
    ctx.save();
    if (playerImgRef.current && playerImgRef.current.complete && playerImgRef.current.naturalWidth > 0) {
      ctx.drawImage(playerImgRef.current, px, py, SPRITE_W, SPRITE_H);
    } else {
      drawFallbackGladiator(ctx, px, py, SPRITE_W, SPRITE_H, NEON_ORANGE, false);
    }
    // Blocking shield glow
    if (player.isBlocking) {
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 3;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 20;
      ctx.strokeRect(px - 4, py - 4, SPRITE_W + 8, SPRITE_H + 8);
    }
    ctx.restore();

    // Draw enemy sprite or fallback (flipped)
    ctx.save();
    ctx.translate(ex + SPRITE_W, ey);
    ctx.scale(-1, 1);
    if (enemyImgRef.current && enemyImgRef.current.complete && enemyImgRef.current.naturalWidth > 0) {
      ctx.drawImage(enemyImgRef.current, 0, 0, SPRITE_W, SPRITE_H);
    } else {
      drawFallbackGladiator(ctx, 0, 0, SPRITE_W, SPRITE_H, NEON_RED, true);
    }
    if (enemy.isBlocking) {
      ctx.strokeStyle = NEON_CYAN;
      ctx.lineWidth = 3;
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 20;
      ctx.strokeRect(-4, -4, SPRITE_W + 8, SPRITE_H + 8);
    }
    ctx.restore();

    // Flash overlay on hit
    if (flash.frames > 0) {
      const alpha = (flash.frames / 12) * 0.5;
      ctx.fillStyle = flash.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');
      // Simple colored flash over the target
      const fx = flash.target === 'player' ? px : ex;
      const fy = flash.target === 'player' ? py : ey;
      ctx.fillStyle = flash.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fillRect(fx - 4, fy - 4, SPRITE_W + 8, SPRITE_H + 8);
    }

    // ── Health bars ──────────────────────────────────────────────────────────
    drawHealthBar(ctx, px, py - 36, SPRITE_W, player.hp, player.maxHp, NEON_ORANGE, 'YOU');
    drawHealthBar(ctx, ex, ey - 36, SPRITE_W, enemy.hp, enemy.maxHp, NEON_RED, 'ENEMY');

    // ── Round counter ────────────────────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 18px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = NEON_YELLOW;
    ctx.shadowColor = NEON_YELLOW;
    ctx.shadowBlur = 12;
    ctx.fillText(`ROUND ${roundRef.current}`, CANVAS_W / 2, 32);
    ctx.restore();

    // ── Phase label ──────────────────────────────────────────────────────────
    const phaseLabel =
      phaseRef.current === 'player-turn'
        ? '⚔ YOUR TURN'
        : phaseRef.current === 'enemy-turn' || phaseRef.current === 'animating'
          ? '🛡 ENEMY TURN'
          : '';
    if (phaseLabel) {
      ctx.save();
      ctx.font = 'bold 14px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = phaseRef.current === 'player-turn' ? NEON_CYAN : NEON_RED;
      ctx.shadowColor = phaseRef.current === 'player-turn' ? NEON_CYAN : NEON_RED;
      ctx.shadowBlur = 10;
      ctx.fillText(phaseLabel, CANVAS_W / 2, 56);
      ctx.restore();
    }

    // Tick animations
    if (shake.frames > 0) shakeRef.current = { ...shake, frames: shake.frames - 1 };
    if (flash.frames > 0) flashRef.current = { ...flash, frames: flash.frames - 1 };

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    if (!imagesReady) return;
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [imagesReady, drawFrame]);

  // ── Game logic ───────────────────────────────────────────────────────────────
  const addLog = useCallback((text: string, color: string) => {
    const entry: LogEntry = { text, color };
    logRef.current = [entry, ...logRef.current].slice(0, 6);
    setLog([...logRef.current]);
  }, []);

  const syncState = useCallback(() => {
    setPlayerHp(playerRef.current.hp);
    setEnemyHp(enemyRef.current.hp);
    setPlayerSpecialCd(playerRef.current.specialCooldown);
    setRound(roundRef.current);
  }, []);

  const checkGameOver = useCallback(() => {
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

  const doEnemyTurn = useCallback(() => {
    const enemy = enemyRef.current;
    const player = playerRef.current;

    // Reduce cooldowns
    if (enemy.specialCooldown > 0) enemy.specialCooldown -= 1;

    // AI weighted random: prefer attack, occasionally block or special
    const roll = Math.random();
    let action: 'attack' | 'block' | 'special';
    if (enemy.specialCooldown === 0 && roll < 0.2) {
      action = 'special';
    } else if (roll < 0.25) {
      action = 'block';
    } else {
      action = 'attack';
    }

    if (action === 'block') {
      enemy.isBlocking = true;
      addLog('Enemy braces for impact!', NEON_CYAN);
    } else if (action === 'special') {
      enemy.specialCooldown = SPECIAL_COOLDOWN_TURNS;
      const dmg = rand(35, 45);
      const reduced = player.isBlocking ? Math.floor(dmg * 0.3) : dmg;
      player.hp = Math.max(0, player.hp - reduced);
      shakeRef.current = { target: 'player', frames: 14 };
      flashRef.current = { target: 'player', frames: 12, color: '#ff0000' };
      addLog(
        player.isBlocking
          ? `Enemy SPECIAL! You blocked — took ${reduced} dmg!`
          : `Enemy SPECIAL MOVE! You took ${reduced} dmg!`,
        NEON_RED,
      );
    } else {
      const dmg = rand(15, 25);
      const reduced = player.isBlocking ? Math.floor(dmg * 0.3) : dmg;
      player.hp = Math.max(0, player.hp - reduced);
      shakeRef.current = { target: 'player', frames: 10 };
      flashRef.current = { target: 'player', frames: 8, color: '#ff0000' };
      addLog(
        player.isBlocking ? `Enemy attacks! You blocked — took ${reduced} dmg.` : `Enemy attacks! You took ${reduced} dmg.`,
        NEON_RED,
      );
    }

    // Reset player block after enemy turn
    player.isBlocking = false;

    // Increment round after both have acted
    roundRef.current += 1;

    syncState();

    if (!checkGameOver()) {
      phaseRef.current = 'player-turn';
      setPhase('player-turn');
    }
  }, [addLog, syncState, checkGameOver]);

  const handleAction = useCallback(
    (action: 'attack' | 'block' | 'special') => {
      if (phaseRef.current !== 'player-turn') return;

      const player = playerRef.current;
      const enemy = enemyRef.current;

      // Reduce player cooldowns
      if (player.specialCooldown > 0) player.specialCooldown -= 1;

      // Reset enemy block each round
      enemy.isBlocking = false;

      if (action === 'attack') {
        const dmg = rand(15, 25);
        const reduced = enemy.isBlocking ? Math.floor(dmg * 0.3) : dmg;
        enemy.hp = Math.max(0, enemy.hp - reduced);
        shakeRef.current = { target: 'enemy', frames: 10 };
        flashRef.current = { target: 'enemy', frames: 8, color: '#ff6600' };
        addLog(
          enemy.isBlocking ? `You attack! Enemy blocked — dealt ${reduced} dmg.` : `You attack! Dealt ${reduced} dmg.`,
          NEON_ORANGE,
        );
      } else if (action === 'block') {
        player.isBlocking = true;
        addLog('You raise your shield!', NEON_CYAN);
      } else if (action === 'special') {
        if (player.specialCooldown > 0) return; // still on cooldown
        player.specialCooldown = SPECIAL_COOLDOWN_TURNS;
        const dmg = rand(35, 45);
        const reduced = enemy.isBlocking ? Math.floor(dmg * 0.3) : dmg;
        enemy.hp = Math.max(0, enemy.hp - reduced);
        shakeRef.current = { target: 'enemy', frames: 16 };
        flashRef.current = { target: 'enemy', frames: 14, color: '#ff6600' };
        addLog(
          enemy.isBlocking
            ? `SPECIAL MOVE! Enemy blocked — dealt ${reduced} dmg!`
            : `SPECIAL MOVE! Dealt ${reduced} dmg!`,
          NEON_YELLOW,
        );
      }

      syncState();

      if (!checkGameOver()) {
        phaseRef.current = 'animating';
        setPhase('animating');
        // Short delay before enemy acts
        setTimeout(() => {
          doEnemyTurn();
        }, 900);
      }
    },
    [addLog, syncState, checkGameOver, doEnemyTurn],
  );

  const resetGame = useCallback(() => {
    playerRef.current = { hp: MAX_HP, maxHp: MAX_HP, isBlocking: false, specialCooldown: 0 };
    enemyRef.current = { hp: MAX_HP, maxHp: MAX_HP, isBlocking: false, specialCooldown: 0 };
    roundRef.current = 1;
    phaseRef.current = 'player-turn';
    logRef.current = [];
    shakeRef.current = { target: null, frames: 0 };
    flashRef.current = { target: null, frames: 0, color: NEON_RED };

    setPhase('player-turn');
    setRound(1);
    setPlayerHp(MAX_HP);
    setEnemyHp(MAX_HP);
    setPlayerSpecialCd(0);
    setLog([]);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isPlayerTurn = phase === 'player-turn';
  const isAnimating = phase === 'animating' || phase === 'enemy-turn';

  return (
    <div className="flex flex-col items-center gap-4 select-none" style={{ fontFamily: "'Chakra Petch', monospace" }}>
      {/* Canvas */}
      <div className="relative" style={{ width: CANVAS_W, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border-2"
          style={{
            borderColor: NEON_ORANGE,
            boxShadow: `0 0 24px ${NEON_ORANGE}55, 0 0 48px ${NEON_ORANGE}22`,
            display: 'block',
            maxWidth: '100%',
          }}
        />

        {/* Loading overlay */}
        {!imagesReady && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl"
            style={{ background: BG_DARK }}
          >
            <p style={{ color: NEON_CYAN, fontSize: 18, fontFamily: "'Chakra Petch', monospace" }}>
              Loading Arena…
            </p>
          </div>
        )}

        {/* Victory overlay */}
        {phase === 'victory' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl gap-6"
            style={{ background: 'rgba(0,0,0,0.82)' }}
          >
            <p
              className="text-5xl font-black tracking-widest uppercase"
              style={{ color: NEON_YELLOW, textShadow: `0 0 24px ${NEON_YELLOW}, 0 0 48px ${NEON_YELLOW}` }}
            >
              VICTORY!
            </p>
            <p style={{ color: NEON_CYAN, fontSize: 16 }}>You defeated the enemy gladiator!</p>
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm transition-all duration-200"
              style={{
                background: NEON_YELLOW,
                color: BG_DARK,
                boxShadow: `0 0 16px ${NEON_YELLOW}`,
              }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* Defeat overlay */}
        {phase === 'defeat' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl gap-6"
            style={{ background: 'rgba(0,0,0,0.82)' }}
          >
            <p
              className="text-5xl font-black tracking-widest uppercase"
              style={{ color: NEON_RED, textShadow: `0 0 24px ${NEON_RED}, 0 0 48px ${NEON_RED}` }}
            >
              DEFEATED
            </p>
            <p style={{ color: '#aaa', fontSize: 16 }}>The arena claims another warrior…</p>
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-lg font-black uppercase tracking-widest text-sm transition-all duration-200"
              style={{
                background: NEON_ORANGE,
                color: BG_DARK,
                boxShadow: `0 0 16px ${NEON_ORANGE}`,
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* HP bars (React UI) */}
      <div className="w-full flex gap-4 justify-between" style={{ maxWidth: CANVAS_W }}>
        <HpBar label="YOU" hp={playerHp} maxHp={MAX_HP} color={NEON_ORANGE} />
        <HpBar label="ENEMY" hp={enemyHp} maxHp={MAX_HP} color={NEON_RED} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <ActionButton
          label="⚔ Attack"
          onClick={() => handleAction('attack')}
          disabled={!isPlayerTurn}
          color={NEON_ORANGE}
          loading={isAnimating}
        />
        <ActionButton
          label="🛡 Block"
          onClick={() => handleAction('block')}
          disabled={!isPlayerTurn}
          color={NEON_CYAN}
          loading={isAnimating}
        />
        <ActionButton
          label={playerSpecialCd > 0 ? `✨ Special (${playerSpecialCd})` : '✨ Special'}
          onClick={() => handleAction('special')}
          disabled={!isPlayerTurn || playerSpecialCd > 0}
          color={NEON_YELLOW}
          loading={isAnimating}
        />
      </div>

      {/* Round + status */}
      <div className="flex items-center gap-6 text-sm" style={{ color: '#888' }}>
        <span style={{ color: NEON_YELLOW }}>Round {round}</span>
        <span>
          {phase === 'player-turn' && <span style={{ color: NEON_CYAN }}>Your turn — choose an action</span>}
          {phase === 'animating' && <span style={{ color: NEON_RED }}>Enemy is acting…</span>}
          {phase === 'enemy-turn' && <span style={{ color: NEON_RED }}>Enemy is acting…</span>}
        </span>
      </div>

      {/* Combat log */}
      <div
        className="w-full rounded-lg p-3 text-xs space-y-1"
        style={{
          maxWidth: CANVAS_W,
          background: 'rgba(0,0,0,0.6)',
          border: `1px solid ${NEON_ORANGE}44`,
          minHeight: 80,
        }}
      >
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: NEON_ORANGE }}>
          Combat Log
        </p>
        {log.length === 0 && <p style={{ color: '#555' }}>The battle begins…</p>}
        {log.map((entry, i) => (
          <p key={i} style={{ color: entry.color, opacity: 1 - i * 0.12 }}>
            {entry.text}
          </p>
        ))}
      </div>

      {/* Instructions */}
      <div
        className="w-full rounded-lg p-3 text-xs"
        style={{
          maxWidth: CANVAS_W,
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid #333`,
          color: '#666',
        }}
      >
        <span style={{ color: NEON_ORANGE }}>⚔ Attack</span> — 15–25 dmg &nbsp;|&nbsp;
        <span style={{ color: NEON_CYAN }}>🛡 Block</span> — reduce next hit by 70% &nbsp;|&nbsp;
        <span style={{ color: NEON_YELLOW }}>✨ Special</span> — 35–45 dmg, {SPECIAL_COOLDOWN_TURNS}-turn cooldown
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function HpBar({ label, hp, maxHp, color }: { label: string; hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1" style={{ color }}>
        <span className="font-bold tracking-widest">{label}</span>
        <span>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#1a1a1a', border: `1px solid ${color}44` }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  color,
  loading,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  color: string;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2 rounded-lg font-black uppercase tracking-widest text-sm transition-all duration-200"
      style={{
        background: disabled ? '#1a1a1a' : `${color}22`,
        color: disabled ? '#444' : color,
        border: `2px solid ${disabled ? '#333' : color}`,
        boxShadow: disabled ? 'none' : `0 0 10px ${color}44`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: loading && !disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  hp: number,
  maxHp: number,
  color: string,
  label: string,
) {
  const pct = Math.max(0, hp / maxHp);
  const barH = 10;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, w, barH);

  // Fill
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(x, y, w * pct, barH);
  ctx.shadowBlur = 0;

  // Border
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, barH);

  // Label
  ctx.font = 'bold 10px "Chakra Petch", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(label, x + w / 2, y - 4);
}

function drawFallbackGladiator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  _isEnemy: boolean,
) {
  // Simple stick-figure gladiator
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  const cx = x + w / 2;
  const headR = w * 0.18;
  const torsoTop = y + headR * 2 + 4;
  const torsoBot = y + h * 0.55;
  const legBot = y + h * 0.9;

  // Head
  ctx.beginPath();
  ctx.arc(cx, y + headR + 2, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(cx, torsoTop);
  ctx.lineTo(cx, torsoBot);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.35, torsoTop + (torsoBot - torsoTop) * 0.2);
  ctx.lineTo(cx + w * 0.35, torsoTop + (torsoBot - torsoTop) * 0.2);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(cx, torsoBot);
  ctx.lineTo(cx - w * 0.25, legBot);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, torsoBot);
  ctx.lineTo(cx + w * 0.25, legBot);
  ctx.stroke();

  // Sword (right arm extended)
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.35, torsoTop + (torsoBot - torsoTop) * 0.2);
  ctx.lineTo(cx + w * 0.7, torsoTop - 10);
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();
}
