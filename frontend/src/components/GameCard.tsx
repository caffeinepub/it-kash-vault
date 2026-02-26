import { Link } from '@tanstack/react-router';
import { Play, Gamepad } from 'lucide-react';
import type { Game } from '../backend';

interface GameCardProps {
  game: Game;
}

const categoryColors: Record<string, string> = {
  Arcade: 'text-neon-orange border-neon-orange',
  Puzzle: 'text-neon-cyan border-neon-cyan',
  Shooter: 'text-neon-pink border-neon-pink',
};

const categoryGlowHover: Record<string, string> = {
  Arcade: 'hover:shadow-neon-orange hover:border-neon-orange/60',
  Puzzle: 'hover:shadow-neon-cyan hover:border-neon-cyan/60',
  Shooter: 'hover:shadow-neon-pink hover:border-neon-pink/60',
};

const playButtonColor: Record<string, string> = {
  Arcade: 'bg-neon-orange shadow-neon-orange',
  Puzzle: 'bg-neon-cyan shadow-neon-cyan',
  Shooter: 'bg-neon-pink shadow-neon-pink',
};

export default function GameCard({ game }: GameCardProps) {
  const slug = encodeURIComponent(game.title.toLowerCase());
  const colorClass = categoryColors[game.category] || 'text-neon-orange border-neon-orange';
  const glowClass = categoryGlowHover[game.category] || 'hover:shadow-neon-orange hover:border-neon-orange/60';
  const playBtnClass = playButtonColor[game.category] || 'bg-neon-orange shadow-neon-orange';
  const thumbSrc = `/assets/generated/${game.thumbnail}`;

  return (
    <Link
      to="/game/$title"
      params={{ title: slug }}
      className={`group block bg-card border border-border rounded-lg overflow-hidden card-hover-glow ${glowClass}`}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={thumbSrc}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.classList.add('flex', 'items-center', 'justify-center');
              parent.style.background = 'oklch(0.12 0.02 265)';
            }
          }}
        />
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
            <div className={`text-background rounded-full p-3 ${playBtnClass}`}>
              <Play className="w-6 h-6 fill-current" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-chakra text-sm font-bold text-foreground group-hover:neon-text-orange transition-all duration-300 leading-tight">
            {game.title}
          </h3>
          <span className={`text-xs font-exo font-semibold border rounded px-2 py-0.5 shrink-0 uppercase tracking-wider ${colorClass}`}>
            {game.category}
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-xs font-exo">
          <Gamepad className="w-3 h-3" />
          <span>{Number(game.playCount).toLocaleString()} plays</span>
        </div>
      </div>
    </Link>
  );
}
