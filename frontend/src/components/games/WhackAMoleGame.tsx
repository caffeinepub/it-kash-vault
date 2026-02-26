import React, { useRef, useEffect, useState, useCallback } from 'react';

const GRID_SIZE = 3;
const GAME_DURATION = 30;
const MOLE_VISIBLE_MS = 900;
const MOLE_INTERVAL_MS = 700;

interface MoleState {
  visible: boolean;
  hit: boolean;
}

export default function WhackAMoleGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<MoleState[]>(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ visible: false, hit: false }))
  );

  const scoreRef = useRef(0);
  const moleTimersRef = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(GRID_SIZE * GRID_SIZE).fill(null)
  );
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'over'>('idle');

  const clearAllTimers = useCallback(() => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (moleIntervalRef.current) clearInterval(moleIntervalRef.current);
    moleTimersRef.current.forEach((t) => { if (t) clearTimeout(t); });
    moleTimersRef.current = Array(GRID_SIZE * GRID_SIZE).fill(null);
  }, []);

  const endGame = useCallback(() => {
    gameStateRef.current = 'over';
    clearAllTimers();
    setMoles(Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ visible: false, hit: false })));
    setGameState('over');
  }, [clearAllTimers]);

  const popMole = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const idx = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    setMoles((prev) => {
      if (prev[idx].visible) return prev;
      const next = [...prev];
      next[idx] = { visible: true, hit: false };
      return next;
    });
    if (moleTimersRef.current[idx]) clearTimeout(moleTimersRef.current[idx]!);
    moleTimersRef.current[idx] = setTimeout(() => {
      setMoles((prev) => {
        const next = [...prev];
        next[idx] = { visible: false, hit: false };
        return next;
      });
    }, MOLE_VISIBLE_MS);
  }, []);

  const startGame = useCallback(() => {
    clearAllTimers();
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles(Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ visible: false, hit: false })));
    gameStateRef.current = 'playing';
    setGameState('playing');

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    moleIntervalRef.current = setInterval(popMole, MOLE_INTERVAL_MS);
  }, [clearAllTimers, endGame, popMole]);

  const handleWhack = useCallback((idx: number) => {
    if (gameStateRef.current !== 'playing') return;
    setMoles((prev) => {
      if (!prev[idx].visible || prev[idx].hit) return prev;
      const next = [...prev];
      next[idx] = { visible: true, hit: true };
      scoreRef.current += 1;
      setScore(scoreRef.current);
      if (moleTimersRef.current[idx]) clearTimeout(moleTimersRef.current[idx]!);
      moleTimersRef.current[idx] = setTimeout(() => {
        setMoles((p) => {
          const n = [...p];
          n[idx] = { visible: false, hit: false };
          return n;
        });
      }, 300);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const holeColors = [
    '#ff6a00', '#00e5ff', '#ff2d78',
    '#00e5ff', '#ff6a00', '#00e5ff',
    '#ff2d78', '#00e5ff', '#ff6a00',
  ];

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Whack-a-Mole</h2>
        <p className="font-exo text-muted-foreground text-sm">Click the moles before they disappear!</p>
      </div>

      <div className="flex gap-8 items-center">
        <div className="text-center">
          <div className="font-chakra text-3xl font-black neon-text-orange">{score}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Score</div>
        </div>
        <div className="text-center">
          <div className={`font-chakra text-3xl font-black ${timeLeft <= 10 ? 'neon-text-pink animate-neon-pulse' : 'neon-text-cyan'}`}>
            {timeLeft}s
          </div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Time</div>
        </div>
      </div>

      <div
        className="grid gap-3 p-4 bg-card border border-border rounded-xl"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {moles.map((mole, idx) => (
          <button
            key={idx}
            onClick={() => handleWhack(idx)}
            className="relative w-24 h-24 rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-100 select-none"
            style={{
              borderColor: holeColors[idx],
              background: mole.visible
                ? mole.hit
                  ? 'oklch(0.72 0.28 340 / 0.3)'
                  : 'oklch(0.72 0.22 35 / 0.2)'
                : 'oklch(0.10 0.02 265)',
              boxShadow: mole.visible
                ? mole.hit
                  ? '0 0 20px #ff2d78, inset 0 0 10px #ff2d78'
                  : `0 0 20px ${holeColors[idx]}, inset 0 0 10px ${holeColors[idx]}`
                : 'inset 0 4px 12px oklch(0 0 0 / 0.5)',
              transform: mole.visible && !mole.hit ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {mole.visible && (
              <span
                className="text-4xl select-none"
                style={{
                  filter: mole.hit ? 'grayscale(1) opacity(0.5)' : 'none',
                  transform: mole.hit ? 'rotate(20deg)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {mole.hit ? '💀' : '🐹'}
              </span>
            )}
            {!mole.visible && (
              <div
                className="w-12 h-4 rounded-full opacity-40"
                style={{ background: holeColors[idx] }}
              />
            )}
          </button>
        ))}
      </div>

      {gameState === 'idle' && (
        <button
          onClick={startGame}
          className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
        >
          Start Game
        </button>
      )}

      {gameState === 'over' && (
        <div className="text-center bg-card border border-neon-orange/40 rounded-xl p-6 w-full">
          <div className="font-chakra text-2xl font-black neon-text-orange mb-2">Time's Up!</div>
          <div className="font-exo text-muted-foreground mb-1">Final Score</div>
          <div className="font-chakra text-5xl font-black neon-text-cyan mb-4">{score}</div>
          <button
            onClick={startGame}
            className="font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      )}

      {gameState === 'idle' && (
        <div className="text-center font-exo text-xs text-muted-foreground max-w-xs">
          Moles pop up randomly — click them before they disappear! You have {GAME_DURATION} seconds.
        </div>
      )}
    </div>
  );
}
