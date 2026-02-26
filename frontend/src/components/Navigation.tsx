import { Link } from '@tanstack/react-router';
import { Gamepad2 } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Gamepad2 className="w-8 h-8 text-neon-orange group-hover:drop-shadow-[0_0_8px_#ff6a00] transition-all duration-300" />
            </div>
            <span className="font-chakra text-xl font-black tracking-wider">
              <span className="neon-text-orange">RANDOM</span>
              {' '}
              <span className="neon-text-cyan">ARCADE</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="font-exo font-semibold text-muted-foreground hover:text-neon-cyan transition-colors duration-200 text-sm uppercase tracking-widest"
            >
              Game Library
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
