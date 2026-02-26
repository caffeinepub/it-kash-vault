import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSoundEffect } from '@/hooks/useSoundEffect';

const GRID_SIZE = 9;
const GAME_DURATION = 30;
const MOLE_SHOW_TIME = 900;
const MOLE_INTERVAL = 700;

export default function WhackAMoleGame() {
  const [moles, setMoles] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hitFlash, setHitFlash] = useState<number | null>(null);

  const moleTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleSpawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const molesRef = useRef<boolean[]>(Array(GRID_SIZE).fill(false));

  const { playMolePop, playWhack, playMoleRetreat, playGameOver } = useSoundEffect();

  const hideMole = useCallback((index: number, whacked: boolean) => {
    if (!whacked) {
      playMoleRetreat();
    }
    setMoles(prev => {
      const next = [...prev];
      next[index] = false;
      molesRef.current = next;
      return next;
    });
    moleTimersRef.current.delete(index);
  }, [playMoleRetreat]);

  const showMole = useCallback(() => {
    const available: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!molesRef.current[i]) available.push(i);
    }
    if (available.length === 0) return;
    const idx = available[Math.floor(Math.random() * available.length)];
    setMoles(prev => {
      const next = [...prev];
      next[idx] = true;
      molesRef.current = next;
      return next;
    });
    playMolePop();
    const timer = setTimeout(() => hideMole(idx, false), MOLE_SHOW_TIME);
    moleTimersRef.current.set(idx, timer);
  }, [playMolePop, hideMole]);

  const startGame = useCallback(() => {
    // Clear any existing timers
    moleTimersRef.current.forEach(t => clearTimeout(t));
    moleTimersRef.current.clear();
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (moleSpawnRef.current) clearInterval(moleSpawnRef.current);

    const freshMoles = Array(GRID_SIZE).fill(false);
    molesRef.current = freshMoles;
    setMoles(freshMoles);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setGameActive(true);

    moleSpawnRef.current = setInterval(showMole, MOLE_INTERVAL);

    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimerRef.current!);
          clearInterval(moleSpawnRef.current!);
          moleTimersRef.current.forEach(t => clearTimeout(t));
          moleTimersRef.current.clear();
          setMoles(Array(GRID_SIZE).fill(false));
          molesRef.current = Array(GRID_SIZE).fill(false);
          setGameActive(false);
          setGameOver(true);
          playGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [showMole, playGameOver]);

  useEffect(() => {
    return () => {
      moleTimersRef.current.forEach(t => clearTimeout(t));
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (moleSpawnRef.current) clearInterval(moleSpawnRef.current);
    };
  }, []);

  const handleWhack = useCallback((index: number) => {
    if (!gameActive || !molesRef.current[index]) return;
    const timer = moleTimersRef.current.get(index);
    if (timer) {
      clearTimeout(timer);
      moleTimersRef.current.delete(index);
    }
    playWhack();
    setHitFlash(index);
    setTimeout(() => setHitFlash(null), 200);
    setMoles(prev => {
      const next = [...prev];
      next[index] = false;
      molesRef.current = next;
      return next;
    });
    setScore(prev => prev + 1);
  }, [gameActive, playWhack]);

  const moleEmojis = ['🐭', '🐹', '🐾'];

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-muted-foreground text-xs font-exo uppercase tracking-wider">Score</div>
          <div className="text-neon-orange font-chakra text-3xl font-bold">{score}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground text-xs font-exo uppercase tracking-wider">Time</div>
          <div className={`font-chakra text-3xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-neon-cyan'}`}>
            {timeLeft}s
          </div>
        </div>
      </div>

      {!gameActive && !gameOver && (
        <div className="text-center space-y-3">
          <p className="text-muted-foreground font-exo">Whack the moles before they disappear!</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-neon-orange text-black font-chakra font-bold rounded-lg hover:bg-neon-orange/80 transition-colors"
          >
            START GAME
          </button>
        </div>
      )}

      {gameOver && (
        <div className="text-center space-y-3">
          <div className="text-neon-orange font-chakra text-2xl font-bold">GAME OVER!</div>
          <div className="text-foreground font-exo text-lg">Final Score: <span className="text-neon-cyan font-bold">{score}</span></div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-neon-orange text-black font-chakra font-bold rounded-lg hover:bg-neon-orange/80 transition-colors"
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {moles.map((hasMole, i) => (
          <button
            key={i}
            onClick={() => handleWhack(i)}
            className={`
              w-24 h-24 rounded-xl border-2 transition-all duration-100 relative overflow-hidden
              ${hasMole
                ? 'bg-amber-900/80 border-neon-orange cursor-pointer hover:scale-95 active:scale-90'
                : 'bg-card border-border cursor-default'
              }
              ${hitFlash === i ? 'bg-neon-orange/40' : ''}
            `}
          >
            <div className={`
              absolute inset-0 flex items-center justify-center text-4xl
              transition-transform duration-150
              ${hasMole ? 'translate-y-0' : 'translate-y-full'}
            `}>
              {moleEmojis[i % moleEmojis.length]}
            </div>
            {!hasMole && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-3 bg-border/50 rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>

      {gameActive && (
        <div className="text-muted-foreground text-sm font-exo">
          Click the moles to whack them! 🔨
        </div>
      )}
    </div>
  );
}
