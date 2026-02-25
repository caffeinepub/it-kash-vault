import { Gamepad2, Heart } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  const appId = encodeURIComponent(typeof window !== 'undefined' ? window.location.hostname : 'kash-is-fart');

  return (
    <footer className="border-t border-border bg-background/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-neon-green" />
            <span className="font-orbitron text-sm font-bold">
              <span className="neon-text-green">KASH IS</span>
              {' '}
              <span className="neon-text-pink">FART</span>
            </span>
          </div>

          <div className="text-center text-muted-foreground text-sm font-rajdhani">
            <p>© {year} KASH IS FART. All rights reserved.</p>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground font-rajdhani">
            <span>Built with</span>
            <Heart className="w-4 h-4 text-neon-pink fill-current" />
            <span>using</span>
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:neon-text-cyan transition-all duration-200 font-semibold"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
