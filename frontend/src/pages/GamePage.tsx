import { useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useIncrementPlayCount } from '../hooks/useQueries';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import WhackAMoleGame from '../components/games/WhackAMoleGame';
import DinoRunnerGame from '../components/games/DinoRunnerGame';
import PongGame from '../components/games/PongGame';
import MemoryMatchGame from '../components/games/MemoryMatchGame';
import AsteroidsGame from '../components/games/AsteroidsGame';
import MinesweeperGame from '../components/games/MinesweeperGame';
import SwordsAndSandalsGame from '../components/games/SwordsAndSandalsGame';
import RetroBowlGame from '../components/games/RetroBowlGame';

const GAME_MAP: Record<string, { component: React.ComponentType; title: string }> = {
  'whack-a-mole': { component: WhackAMoleGame, title: 'Whack-a-Mole' },
  'dino runner': { component: DinoRunnerGame, title: 'Dino Runner' },
  'pong': { component: PongGame, title: 'Pong' },
  'memory match': { component: MemoryMatchGame, title: 'Memory Match' },
  'asteroids': { component: AsteroidsGame, title: 'Asteroids' },
  'minesweeper': { component: MinesweeperGame, title: 'Minesweeper' },
  'swords & sandals': { component: SwordsAndSandalsGame, title: 'Swords & Sandals' },
  'swords-sandals': { component: SwordsAndSandalsGame, title: 'Swords & Sandals' },
  'retro bowl': { component: RetroBowlGame, title: 'Retro Bowl' },
  'retro-bowl': { component: RetroBowlGame, title: 'Retro Bowl' },
};

export default function GamePage() {
  const { title } = useParams({ from: '/game/$title' });
  const incrementPlayCount = useIncrementPlayCount();

  const decodedTitle = decodeURIComponent(title).toLowerCase();
  const gameEntry = GAME_MAP[decodedTitle];

  useEffect(() => {
    if (gameEntry) {
      incrementPlayCount.mutate(gameEntry.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameEntry?.title]);

  if (!gameEntry) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Gamepad2 className="w-20 h-20 text-muted-foreground mb-6 opacity-30" />
        <h1 className="font-chakra text-4xl font-black neon-text-orange mb-4">404</h1>
        <p className="font-chakra text-xl text-muted-foreground mb-2">Game Not Found</p>
        <p className="font-exo text-muted-foreground mb-8">
          The game "{decodeURIComponent(title)}" doesn't exist in our arcade.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-neon-orange text-background font-chakra font-bold text-sm uppercase tracking-widest px-6 py-3 rounded-lg shadow-neon-orange-sm hover:shadow-neon-orange transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Arcade
        </Link>
      </div>
    );
  }

  const GameComponent = gameEntry.component;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-orange transition-colors duration-200 font-exo font-semibold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Arcade
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-chakra text-3xl font-black neon-text-orange">{gameEntry.title}</h1>
        </div>

        <div className="flex justify-center">
          <GameComponent />
        </div>
      </div>
    </div>
  );
}
