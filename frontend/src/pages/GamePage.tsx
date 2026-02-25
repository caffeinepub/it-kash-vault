import { useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useIncrementPlayCount } from '../hooks/useQueries';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import GeometryDashGame from '../components/games/GeometryDashGame';
import SnakeGame from '../components/games/SnakeGame';
import FlappyBirdGame from '../components/games/FlappyBirdGame';
import BreakoutGame from '../components/games/BreakoutGame';
import Game2048 from '../components/games/Game2048';
import TetrisGame from '../components/games/TetrisGame';
import { PacManGame } from '../components/games/PacManGame';
import { SpaceInvadersGame } from '../components/games/SpaceInvadersGame';
import { SwordsAndSandalsGame } from '../components/games/SwordsAndSandalsGame';
import { AmongUsGame } from '../components/games/AmongUsGame';
import TungTungGame from '../components/games/TungTungGame';
import BlockBlastGame from '../components/games/BlockBlastGame';
import SixSevenGame from '../components/games/SixSevenGame';

const GAME_MAP: Record<string, { component: React.ComponentType; title: string }> = {
  'gd runner': { component: GeometryDashGame, title: 'GD Runner' },
  'snake': { component: SnakeGame, title: 'Snake' },
  'flappy bird': { component: FlappyBirdGame, title: 'Flappy Bird' },
  'breakout': { component: BreakoutGame, title: 'Breakout' },
  '2048': { component: Game2048, title: '2048' },
  'tetris': { component: TetrisGame, title: 'Tetris' },
  'pac-man': { component: PacManGame, title: 'Pac-Man' },
  'space invaders': { component: SpaceInvadersGame, title: 'Space Invaders' },
  'swords & sandals': { component: SwordsAndSandalsGame, title: 'Swords & Sandals' },
  'among us': { component: AmongUsGame, title: 'Among Us' },
  'tung tung tung': { component: TungTungGame, title: 'Tung Tung Tung' },
  'block blast': { component: BlockBlastGame, title: 'Block Blast' },
  '67 clicker': { component: SixSevenGame, title: '67 Clicker' },
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
        <h1 className="font-orbitron text-4xl font-black neon-text-pink mb-4">404</h1>
        <p className="font-orbitron text-xl text-muted-foreground mb-2">Game Not Found</p>
        <p className="font-rajdhani text-muted-foreground mb-8">
          The game "{decodeURIComponent(title)}" doesn't exist in our arcade.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-neon-green text-background font-orbitron font-bold text-sm uppercase tracking-widest px-6 py-3 rounded-lg shadow-neon-green-sm hover:shadow-neon-green transition-all duration-300"
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
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-green transition-colors duration-200 font-rajdhani font-semibold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Arcade
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-orbitron text-3xl font-black neon-text-green">{gameEntry.title}</h1>
        </div>

        <div className="flex justify-center">
          <GameComponent />
        </div>
      </div>
    </div>
  );
}
