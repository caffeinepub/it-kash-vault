import { Play, Zap, Gamepad } from 'lucide-react';
import type { Game } from '../backend';

interface FeaturedGameHeroProps {
  game: Game;
  onPlay: () => void;
}

export default function FeaturedGameHero({ game, onPlay }: FeaturedGameHeroProps) {
  const thumbSrc = `/assets/generated/${game.thumbnail}`;

  return (
    <section className="relative overflow-hidden bg-card border-b border-border">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-neon-green" />
              <span className="font-rajdhani font-semibold text-neon-green text-sm uppercase tracking-widest">
                Featured Game
              </span>
            </div>

            <h1 className="font-orbitron text-4xl md:text-6xl font-black mb-4 leading-tight">
              <span className="neon-text-green">{game.title}</span>
            </h1>

            <p className="font-rajdhani text-lg text-muted-foreground mb-6 max-w-lg leading-relaxed">
              {game.description}
            </p>

            <div className="flex items-center gap-6 mb-8 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gamepad className="w-4 h-4 text-neon-cyan" />
                <span className="font-rajdhani font-semibold text-sm">
                  {Number(game.playCount).toLocaleString()} plays
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-rajdhani font-semibold text-xs border border-neon-cyan text-neon-cyan rounded px-2 py-0.5 uppercase tracking-wider">
                  {game.category}
                </span>
              </div>
            </div>

            <button
              onClick={onPlay}
              className="group inline-flex items-center gap-3 bg-neon-green text-background font-orbitron font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-lg shadow-neon-green hover:shadow-neon-green hover:scale-105 transition-all duration-300"
            >
              <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
              Play Now
            </button>
          </div>

          <div className="flex-1 max-w-lg w-full">
            <div className="relative rounded-xl overflow-hidden border border-neon-green/30 shadow-neon-green-sm group">
              <img
                src={thumbSrc}
                alt={game.title}
                className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
