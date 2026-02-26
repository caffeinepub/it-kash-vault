import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetAllGames, useIncrementPlayCount } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { seedInitialGames } from '../lib/seedGames';
import GameCard from '../components/GameCard';
import FeaturedGameHero from '../components/FeaturedGameHero';
import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Game } from '../backend';

const CATEGORIES = ['All', 'Arcade', 'Puzzle', 'Shooter', 'RPG', 'Sports'];

export default function HomePage() {
  const navigate = useNavigate();
  const { actor, isFetching: actorLoading } = useActor();
  const { data: games, isLoading, isFetched } = useGetAllGames();
  const incrementPlayCount = useIncrementPlayCount();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const seededRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (actor && !actorLoading && !seededRef.current) {
      seededRef.current = true;
      seedInitialGames(
        () => actor.getAllGames(),
        (title, description, category, thumbnail) =>
          actor.addGame(title, description, category, thumbnail)
      ).then(() => {
        // After seeding, invalidate the games query so it refetches with the new data
        queryClient.invalidateQueries({ queryKey: ['games'] });
      }).catch((err) => {
        console.error('Seeding failed:', err);
      });
    }
  }, [actor, actorLoading, queryClient]);

  const filteredGames: Game[] = (games || []).filter((game) => {
    if (selectedCategory === 'All') return true;
    return game.category === selectedCategory;
  });

  const featuredGame = (games || []).find((g) => g.title === 'Dino Runner');

  const handlePlayFeatured = () => {
    if (featuredGame) {
      incrementPlayCount.mutate(featuredGame.title);
      navigate({ to: '/game/$title', params: { title: encodeURIComponent(featuredGame.title.toLowerCase()) } });
    }
  };

  // Show loading state when: actor is still initializing OR query is actively loading
  const showLoading = actorLoading || !actor || isLoading;

  // Only show empty state when we've finished loading and truly have no games
  const showEmpty = !showLoading && isFetched && filteredGames.length === 0;

  return (
    <div className="min-h-screen">
      {featuredGame && (
        <FeaturedGameHero game={featuredGame} onPlay={handlePlayFeatured} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="font-chakra text-2xl font-bold mb-6 neon-text-cyan">
            Game Library
          </h2>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-exo font-semibold text-sm uppercase tracking-widest px-4 py-2 rounded border transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-neon-orange text-background border-neon-orange shadow-neon-orange-sm'
                    : 'text-muted-foreground border-border hover:border-neon-orange/50 hover:text-neon-orange'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {showLoading ? (
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
        ) : showEmpty ? (
          <div className="text-center py-24">
            <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-chakra text-muted-foreground text-lg">No games found</p>
            <p className="font-exo text-muted-foreground mt-2">
              {selectedCategory !== 'All'
                ? `No ${selectedCategory} games yet.`
                : 'No games available yet. Check back soon!'}
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
