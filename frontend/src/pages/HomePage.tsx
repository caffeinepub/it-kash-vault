import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetAllGames, useIncrementPlayCount } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { seedInitialGames } from '../lib/seedGames';
import GameCard from '../components/GameCard';
import FeaturedGameHero from '../components/FeaturedGameHero';
import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2 } from 'lucide-react';
import type { Game } from '../backend';

const CATEGORIES = ['All', 'Arcade', 'Puzzle', 'RPG', 'Social', 'Clicker'];

export default function HomePage() {
  const navigate = useNavigate();
  const { actor, isFetching: actorLoading } = useActor();
  const { data: games, isLoading } = useGetAllGames();
  const incrementPlayCount = useIncrementPlayCount();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (actor && !actorLoading && !seeded) {
      setSeeded(true);
      seedInitialGames(
        () => actor.getAllGames(),
        (title, description, category, thumbnail) =>
          actor.addGame(title, description, category, thumbnail)
      );
    }
  }, [actor, actorLoading, seeded]);

  const filteredGames: Game[] = (games || []).filter((game) => {
    if (selectedCategory === 'All') return true;
    return game.category === selectedCategory;
  });

  const featuredGame = (games || []).find((g) => g.title === 'GD Runner');

  const handlePlayFeatured = () => {
    if (featuredGame) {
      incrementPlayCount.mutate(featuredGame.title);
      navigate({ to: '/game/$title', params: { title: encodeURIComponent(featuredGame.title.toLowerCase()) } });
    }
  };

  return (
    <div className="min-h-screen">
      {featuredGame && (
        <FeaturedGameHero game={featuredGame} onPlay={handlePlayFeatured} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="font-orbitron text-2xl font-bold mb-6 neon-text-cyan">
            Game Library
          </h2>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-rajdhani font-semibold text-sm uppercase tracking-widest px-4 py-2 rounded border transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-neon-green text-background border-neon-green shadow-neon-green-sm'
                    : 'text-muted-foreground border-border hover:border-neon-green/50 hover:text-neon-green'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-24">
            <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-orbitron text-muted-foreground text-lg">No games found</p>
            <p className="font-rajdhani text-muted-foreground mt-2">
              {selectedCategory !== 'All' ? `No ${selectedCategory} games yet.` : 'Games are loading...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <GameCard key={game.title} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
