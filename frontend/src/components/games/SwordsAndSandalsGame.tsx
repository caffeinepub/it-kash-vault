import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

const W = 800;
const H = 450;

type Action = 'attack' | 'block' | 'special';
type Phase = 'player_turn' | 'enemy_turn' | 'victory' | 'defeat' | 'animating';

interface Fighter {
  hp: number;
  maxHp: number;
  name: string;
  x: number;
  color: string;
  glowColor: string;
}

interface GameState {
  player: Fighter;
  enemy: Fighter;
  phase: Phase;
  round: number;
  log: string[];
  shakeTarget: 'player' | 'enemy' | null;
  shakeFrame: number;
  flashTarget: 'player' | 'enemy' | null;
  flashFrame: number;
}

function makeInitialState(): GameState {
  return {
    player: { hp: 100, maxHp: 100, name: 'HERO', x: 180, color: '#22d3ee', glowColor: '#22d3ee' },
    enemy: { hp: 100, maxHp: 100, name: 'GLADIATOR', x: 580, color: '#f97316', glowColor: '#f97316' },
    phase: 'player_turn',
    round: 1,
    log: ['Round 1 begins! Choose your action.'],
    shakeTarget: null,
    shakeFrame: 0,
    flashTarget: null,
    flashFrame: 0,
  };
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export default function SwordsAndSandalsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('player_turn');
  const [log, setLog] = useState<string[]>(['Round 1 begins! Choose your action.']);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [round, setRound] = useState(1);

  const {
    playSwordHit,
    playBlock,
    playSpecialMove,
    playEnemyHit,
    playVictoryFanfare,
    playDefeatSound,
  } = useSoundEffect();

  const addLog = useCallback((msg: string) => {
    stateRef.current.log = [msg, ...stateRef.current.log].slice(0, 6);
    setLog([...stateRef.current.log]);
  }, []);

  const triggerShake = useCallback((target: 'player' | 'enemy') => {
    stateRef.current.shakeTarget = target;
    stateRef.current.shakeFrame = 20;
  }, []);

  const triggerFlash = useCallback((target: 'player' | 'enemy') => {
    stateRef.current.flashTarget = target;
    stateRef.current.flashFrame = 15;
  }, []);

  const enemyTurn = useCallback(() => {
    const s = stateRef.current;
    const roll = Math.random();
    let dmg = 0;
    let msg = '';

    if (roll < 0.6) {
      dmg = Math.floor(Math.random() * 18) + 8;
      s.player.hp = clamp(s.player.hp - dmg, 0, s.player.maxHp);
      msg = `${s.enemy.name} attacks for ${dmg} damage!`;
      triggerShake('player');
      triggerFlash('player');
      playEnemyHit();
    } else if (roll < 0.85) {
      msg = `${s.enemy.name} braces for impact!`;
    } else {
      dmg = Math.floor(Math.random() * 28) + 18;
      s.player.hp = clamp(s.player.hp - dmg, 0, s.player.maxHp);
      msg = `${s.enemy.name} unleashes a POWER STRIKE for ${dmg}!`;
      triggerShake('player');
      triggerFlash('player');
      playEnemyHit();
    }

    addLog(msg);
    setPlayerHp(s.player.hp);

    if (s.player.hp <= 0) {
      s.phase = 'defeat';
      setPhase('defeat');
      playDefeatSound();
      addLog('You have been defeated...');
    } else {
      s.round++;
      s.phase = 'player_turn';
      setPhase('player_turn');
      setRound(s.round);
      addLog(`Round ${s.round} — Your turn!`);
    }
  }, [addLog, triggerShake, triggerFlash, playEnemyHit, playDefeatSound]);

  const handleAction = useCallback((action: Action) => {
    const s = stateRef.current;
    if (s.phase !== 'player_turn') return;

    s.phase = 'animating';
    setPhase('animating');

    let dmg = 0;
    let msg = '';

    if (action === 'attack') {
      dmg = Math.floor(Math.random() * 20) + 10;
      s.enemy.hp = clamp(s.enemy.hp - dmg, 0, s.enemy.maxHp);
      msg = `You attack for ${dmg} damage!`;
      triggerShake('enemy');
      triggerFlash('enemy');
      playSwordHit();
    } else if (action === 'block') {
      msg = 'You raise your shield and brace!';
      playBlock();
    } else if (action === 'special') {
      dmg = Math.floor(Math.random() * 35) + 20;
      s.enemy.hp = clamp(s.enemy.hp - dmg, 0, s.enemy.maxHp);
      msg = `SPECIAL MOVE! You deal ${dmg} damage!`;
      triggerShake('enemy');
      triggerFlash('enemy');
      playSpecialMove();
    }

    addLog(msg);
    setEnemyHp(s.enemy.hp);

    if (s.enemy.hp <= 0) {
      s.phase = 'victory';
      setPhase('victory');
      playVictoryFanfare();
      addLog('VICTORY! The crowd goes wild!');
      return;
    }

    setTimeout(() => enemyTurn(), 900);
  }, [addLog, triggerShake, triggerFlash, playSwordHit, playBlock, playSpecialMove, playVictoryFanfare, enemyTurn]);

  const restartGame = useCallback(() => {
    stateRef.current = makeInitialState();
    setPhase('player_turn');
    setLog(['Round 1 begins! Choose your action.']);
    setPlayerHp(100);
    setEnemyHp(100);
    setRound(1);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawHealthBar = (x: number, y: number, w: number, hp: number, maxHp: number, color: string) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, w, 16);
      const pct = hp / maxHp;
      const barColor = pct > 0.5 ? color : pct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, w * pct, 16);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, 16);
    };

    const drawFighter = (fighter: Fighter, shaking: boolean, flashing: boolean) => {
      const shakeX = shaking ? (Math.random() - 0.5) * 10 : 0;
      const isPlayer = fighter.name === 'HERO';
      ctx.save();
      ctx.translate(fighter.x + shakeX, 0);

      if (flashing) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;
      } else {
        ctx.shadowColor = fighter.glowColor;
        ctx.shadowBlur = 15;
      }

      // Body
      ctx.fillStyle = flashing ? '#ffffff' : fighter.color;
      ctx.fillRect(-20, 160, 40, 80);
      // Head
      ctx.beginPath();
      ctx.arc(0, 145, 22, 0, Math.PI * 2);
      ctx.fill();
      // Weapon
      if (isPlayer) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(22, 155, 8, 60);
        ctx.fillRect(14, 165, 24, 8);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-30, 155, 8, 60);
        ctx.fillRect(-38, 165, 24, 8);
      }
      // Shield
      ctx.fillStyle = '#475569';
      if (isPlayer) {
        ctx.fillRect(-38, 160, 16, 50);
      } else {
        ctx.fillRect(22, 160, 16, 50);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const loop = () => {
      const s = stateRef.current;

      // Update shake/flash
      if (s.shakeFrame > 0) s.shakeFrame--;
      else s.shakeTarget = null;
      if (s.flashFrame > 0) s.flashFrame--;
      else s.flashTarget = null;

      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // Arena floor
      const grad = ctx.createLinearGradient(0, 280, 0, H);
      grad.addColorStop(0, '#1e1a0e');
      grad.addColorStop(1, '#0f0d07');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 280, W, H - 280);

      // Arena line
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 280);
      ctx.lineTo(W, 280);
      ctx.stroke();

      // Crowd stands
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, W, 80);
      for (let i = 0; i < 40; i++) {
        const cx = 20 + i * 20;
        const cy = 20 + (i % 3) * 18;
        ctx.fillStyle = i % 4 === 0 ? '#f97316' : i % 4 === 1 ? '#22d3ee' : '#6366f1';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fighters
      const playerShaking = s.shakeTarget === 'player' && s.shakeFrame > 0;
      const enemyShaking = s.shakeTarget === 'enemy' && s.shakeFrame > 0;
      const playerFlashing = s.flashTarget === 'player' && s.flashFrame > 0;
      const enemyFlashing = s.flashTarget === 'enemy' && s.flashFrame > 0;

      drawFighter(s.player, playerShaking, playerFlashing);
      drawFighter(s.enemy, enemyShaking, enemyFlashing);

      // Health bars
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px "Chakra Petch", monospace';
      ctx.fillText(s.player.name, 60, 310);
      drawHealthBar(60, 315, 160, s.player.hp, s.player.maxHp, s.player.color);
      ctx.fillText(`${s.player.hp}/${s.player.maxHp}`, 60, 346);

      ctx.textAlign = 'right';
      ctx.fillText(s.enemy.name, W - 60, 310);
      ctx.textAlign = 'left';
      drawHealthBar(W - 220, 315, 160, s.enemy.hp, s.enemy.maxHp, s.enemy.color);
      ctx.textAlign = 'right';
      ctx.fillText(`${s.enemy.hp}/${s.enemy.maxHp}`, W - 60, 346);
      ctx.textAlign = 'left';

      // Round
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 16px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${s.round}`, W / 2, 310);
      ctx.textAlign = 'left';

      // Victory/Defeat overlays
      if (s.phase === 'victory') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 52px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', W / 2, H / 2 - 20);
        ctx.textAlign = 'left';
      }
      if (s.phase === 'defeat') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 52px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DEFEATED', W / 2, H / 2 - 20);
        ctx.textAlign = 'left';
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-lg border border-neon-orange/30 max-w-full"
      />

      {/* Combat log */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg p-3 space-y-1 min-h-[80px]">
        {log.slice(0, 4).map((entry, i) => (
          <div key={i} className={`font-exo text-sm ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {entry}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {phase === 'player_turn' && (
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => handleAction('attack')}
            className="px-6 py-3 bg-neon-orange text-black font-chakra font-bold rounded-lg hover:bg-neon-orange/80 transition-colors"
          >
            ⚔️ ATTACK
          </button>
          <button
            onClick={() => handleAction('block')}
            className="px-6 py-3 bg-neon-cyan text-black font-chakra font-bold rounded-lg hover:bg-neon-cyan/80 transition-colors"
          >
            🛡️ BLOCK
          </button>
          <button
            onClick={() => handleAction('special')}
            className="px-6 py-3 bg-neon-pink text-black font-chakra font-bold rounded-lg hover:bg-neon-pink/80 transition-colors"
          >
            ✨ SPECIAL
          </button>
        </div>
      )}

      {phase === 'animating' && (
        <div className="text-neon-cyan font-chakra animate-pulse">Enemy is thinking...</div>
      )}

      {(phase === 'victory' || phase === 'defeat') && (
        <div className="flex flex-col items-center gap-3">
          <div className={`font-chakra text-2xl font-bold ${phase === 'victory' ? 'text-neon-cyan' : 'text-red-400'}`}>
            {phase === 'victory' ? '🏆 VICTORY!' : '💀 DEFEATED'}
          </div>
          <button
            onClick={restartGame}
            className="px-8 py-3 bg-neon-orange text-black font-chakra font-bold rounded-lg hover:bg-neon-orange/80 transition-colors"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      <div className="text-muted-foreground text-xs font-exo text-center">
        Round {round} | Player HP: {playerHp} | Enemy HP: {enemyHp}
      </div>
    </div>
  );
}
