import React, { useState, useEffect, useRef, useCallback } from 'react';

const SYMBOLS = ['🎮', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '🏆'];

interface Card {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards(): Card[] {
  const pairs = [...SYMBOLS, ...SYMBOLS];
  return shuffle(pairs).map((symbol, i) => ({
    id: i,
    symbol,
    flipped: false,
    matched: false,
  }));
}

export default function MemoryMatchGame() {
  const [cards, setCards] = useState<Card[]>(makeCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won'>('idle');
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const resetGame = useCallback(() => {
    stopTimer();
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setElapsed(0);
    setGameStatus('idle');
    setLocked(false);
    startedRef.current = false;
  }, [stopTimer]);

  const handleCardClick = useCallback((id: number) => {
    if (locked) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;
    if (flipped.length >= 2) return;

    if (!startedRef.current) {
      startedRef.current = true;
      setGameStatus('playing');
      startTimer();
    }

    const newFlipped = [...flipped, id];
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newFlipped;
      const cardA = cards[a];
      const cardB = cards[b];

      if (cardA.symbol === cardB.symbol) {
        // Match
        setCards((prev) =>
          prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c
          )
        );
        setFlipped([]);
        // Check win
        setCards((prev) => {
          const updated = prev.map((c) =>
            c.id === a || c.id === b ? { ...c, matched: true, flipped: true } : c
          );
          const allMatched = updated.every((c) => c.matched);
          if (allMatched) {
            stopTimer();
            setGameStatus('won');
          }
          return updated;
        });
      } else {
        // No match
        setLocked(true);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === a || c.id === b ? { ...c, flipped: false } : c
            )
          );
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  }, [cards, flipped, locked, startTimer, stopTimer]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const symbolColors: Record<string, string> = {
    '🎮': '#ff6a00', '🚀': '#00e5ff', '⚡': '#ffe600',
    '🔥': '#ff2d78', '💎': '#00e5ff', '🌟': '#ffe600',
    '🎯': '#ff6a00', '🏆': '#bf5fff',
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="font-chakra text-3xl font-black neon-text-orange mb-1">Memory Match</h2>
        <p className="font-exo text-muted-foreground text-sm">Find all 8 matching pairs!</p>
      </div>

      <div className="flex gap-8 items-center">
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-orange">{moves}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Moves</div>
        </div>
        <div className="text-center">
          <div className="font-chakra text-2xl font-black neon-text-cyan">{formatTime(elapsed)}</div>
          <div className="font-exo text-xs text-muted-foreground uppercase tracking-widest">Time</div>
        </div>
        <button
          onClick={resetGame}
          className="font-exo font-semibold text-xs uppercase tracking-widest px-4 py-2 rounded border border-border text-muted-foreground hover:border-neon-orange/50 hover:text-neon-orange transition-all duration-200"
        >
          New Game
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.matched || locked}
            className="relative w-16 h-16 rounded-lg border-2 transition-all duration-300 select-none"
            style={{
              borderColor: card.matched
                ? symbolColors[card.symbol] || '#ff6a00'
                : card.flipped
                ? '#ff6a00'
                : 'oklch(0.20 0.03 265)',
              background: card.matched
                ? `${symbolColors[card.symbol] || '#ff6a00'}22`
                : card.flipped
                ? 'oklch(0.14 0.025 265)'
                : 'oklch(0.12 0.02 265)',
              boxShadow: card.matched
                ? `0 0 12px ${symbolColors[card.symbol] || '#ff6a00'}`
                : card.flipped
                ? '0 0 8px #ff6a00'
                : 'none',
              transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(0deg)',
              cursor: card.matched ? 'default' : 'pointer',
            }}
          >
            <span
              className="text-2xl"
              style={{
                opacity: card.flipped || card.matched ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            >
              {card.symbol}
            </span>
            {!card.flipped && !card.matched && (
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-lg font-chakra font-bold">
                ?
              </span>
            )}
          </button>
        ))}
      </div>

      {gameStatus === 'won' && (
        <div className="text-center bg-card border border-neon-orange/40 rounded-xl p-6 w-full">
          <div className="text-4xl mb-2">🏆</div>
          <div className="font-chakra text-2xl font-black neon-text-orange mb-2">You Won!</div>
          <div className="font-exo text-muted-foreground mb-1">
            Completed in <span className="text-neon-orange font-bold">{moves} moves</span> and{' '}
            <span className="text-neon-cyan font-bold">{formatTime(elapsed)}</span>
          </div>
          <button
            onClick={resetGame}
            className="mt-4 font-chakra font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg bg-neon-orange text-background shadow-neon-orange hover:scale-105 transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      )}

      {gameStatus === 'idle' && (
        <div className="font-exo text-xs text-muted-foreground text-center">
          Click any card to start. Match all pairs to win!
        </div>
      )}
    </div>
  );
}
