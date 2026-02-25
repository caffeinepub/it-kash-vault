import { Link } from '@tanstack/react-router';
import { Play, Gamepad } from 'lucide-react';
import type { Game } from '../backend';

interface GameCardProps {
  game: Game;
}

const categoryColors: Record<string, string> = {
  Arcade: 'text-neon-cyan border-neon-cyan',
  Puzzle: 'text-neon-purple border-neon-purple',
  RPG: 'text-neon-yellow border-neon-yellow',
  Social: 'text-neon-pink border-neon-pink',
  Clicker: 'text-neon-green border-neon-green',
};

const categoryGlow: Record<string, string> = {
  Arcade: 'hover:shadow-neon-cyan',
  Puzzle: 'hover:shadow-neon-purple',
  RPG: 'hover:shadow-neon-yellow',
  Social: 'hover:shadow-neon-pink',
  Clicker: 'hover:shadow-neon-green',
};

export default function GameCard({ game }: GameCardProps) {
  const slug = encodeURIComponent(game.title.toLowerCase());
  const colorClass = categoryColors[game.category] || 'text-neon-cyan border-neon-cyan';
  const glowClass = categoryGlow[game.category] || 'hover:shadow-neon-cyan';
  const thumbSrc = `/assets/generated/${game.thumbnail}`;

  return (
    <Link
      to="/game/$title"
      params={{ title: slug }}
      className={`group block bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:border-opacity-80 hover:scale-[1.02] hover:-translate-y-1 ${glowClass}`}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={thumbSrc}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
          }}
        />
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
            <div className="bg-neon-green text-background rounded-full p-3 shadow-neon-green">
              <Play className="w-6 h-6 fill-current" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-orbitron text-sm font-bold text-foreground group-hover:neon-text-green transition-all duration-300 leading-tight">
            {game.title}
          </h3>
          <span className={`text-xs font-rajdhani font-semibold border rounded px-2 py-0.5 shrink-0 uppercase tracking-wider ${colorClass}`}>
            {game.category}
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-xs font-rajdhani">
          <Gamepad className="w-3 h-3" />
          <span>{Number(game.playCount).toLocaleString()} plays</span>
        </div>
      </div>
    </Link>
  );
}
