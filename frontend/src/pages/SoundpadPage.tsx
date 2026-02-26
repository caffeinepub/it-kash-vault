import { useState, useCallback } from 'react';
import { useSoundEffect } from '../hooks/useSoundEffect';

interface SoundButton {
  id: string;
  label: string;
  icon: string;
  subtext?: string;
  color: string;       // hex for glow
  textColor: string;   // tailwind text class
  bgClass: string;     // tailwind bg class
  borderClass: string; // tailwind border class
  activeClass: string; // tailwind active bg class
  glowStyle: string;   // inline box-shadow for active
  size?: 'normal' | 'wide' | 'tall';
  shape?: 'rounded' | 'sharp' | 'pill';
  play: () => void;
}

export default function SoundpadPage() {
  const sounds = useSoundEffect();
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const triggerSound = useCallback((id: string, play: () => void) => {
    play();
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 350);
  }, []);

  const soundButtons: Omit<SoundButton, 'play'>[] = [
    {
      id: 'airhorn',
      label: 'AIRHORN',
      icon: '📯',
      subtext: 'BWAAAMP',
      color: '#ff4400',
      textColor: 'text-[#ff6622]',
      bgClass: 'bg-[#ff440010]',
      borderClass: 'border-[#ff4400]/50',
      activeClass: 'bg-[#ff440035]',
      glowStyle: '0 0 30px #ff4400, 0 0 60px #ff440066',
      shape: 'sharp',
    },
    {
      id: 'fart',
      label: 'FART',
      icon: '💨',
      subtext: 'pfffft...',
      color: '#8bc34a',
      textColor: 'text-[#a5d65e]',
      bgClass: 'bg-[#8bc34a0d]',
      borderClass: 'border-[#8bc34a]/40',
      activeClass: 'bg-[#8bc34a30]',
      glowStyle: '0 0 25px #8bc34a, 0 0 50px #8bc34a55',
      shape: 'rounded',
    },
    {
      id: 'bruh',
      label: 'BRUH',
      icon: '😐',
      subtext: '...',
      color: '#607d8b',
      textColor: 'text-[#90a4ae]',
      bgClass: 'bg-[#607d8b0d]',
      borderClass: 'border-[#607d8b]/40',
      activeClass: 'bg-[#607d8b30]',
      glowStyle: '0 0 20px #607d8b, 0 0 40px #607d8b44',
      shape: 'rounded',
    },
    {
      id: 'sad-trombone',
      label: 'SAD TROMBONE',
      icon: '🎺',
      subtext: 'wah wah waaah',
      color: '#b8860b',
      textColor: 'text-[#d4a017]',
      bgClass: 'bg-[#b8860b0d]',
      borderClass: 'border-[#b8860b]/40',
      activeClass: 'bg-[#b8860b30]',
      glowStyle: '0 0 25px #b8860b, 0 0 50px #b8860b55',
      shape: 'rounded',
    },
    {
      id: 'crickets',
      label: 'CRICKETS',
      icon: '🦗',
      subtext: '...chirp chirp...',
      color: '#4caf50',
      textColor: 'text-[#66bb6a]',
      bgClass: 'bg-[#4caf500d]',
      borderClass: 'border-[#4caf50]/35',
      activeClass: 'bg-[#4caf5028]',
      glowStyle: '0 0 20px #4caf50, 0 0 40px #4caf5044',
      shape: 'rounded',
    },
    {
      id: 'wow',
      label: 'WOW',
      icon: '🤩',
      subtext: 'WOOOOW',
      color: '#00e5ff',
      textColor: 'text-[#00e5ff]',
      bgClass: 'bg-[#00e5ff0d]',
      borderClass: 'border-[#00e5ff]/40',
      activeClass: 'bg-[#00e5ff28]',
      glowStyle: '0 0 30px #00e5ff, 0 0 60px #00e5ff55',
      shape: 'pill',
    },
    {
      id: 'oof',
      label: 'OOF',
      icon: '😵',
      subtext: 'oof.',
      color: '#ff7043',
      textColor: 'text-[#ff8a65]',
      bgClass: 'bg-[#ff70430d]',
      borderClass: 'border-[#ff7043]/40',
      activeClass: 'bg-[#ff704330]',
      glowStyle: '0 0 25px #ff7043, 0 0 50px #ff704355',
      shape: 'rounded',
    },
    {
      id: 'glass-break',
      label: 'GLASS BREAK',
      icon: '🪟',
      subtext: '💥 CRASH',
      color: '#b0bec5',
      textColor: 'text-[#cfd8dc]',
      bgClass: 'bg-[#b0bec50d]',
      borderClass: 'border-[#b0bec5]/40',
      activeClass: 'bg-[#b0bec530]',
      glowStyle: '0 0 25px #b0bec5, 0 0 50px #b0bec555',
      shape: 'sharp',
    },
    {
      id: 'boing',
      label: 'BOING',
      icon: '🌀',
      subtext: 'sproing~',
      color: '#e040fb',
      textColor: 'text-[#ea80fc]',
      bgClass: 'bg-[#e040fb0d]',
      borderClass: 'border-[#e040fb]/40',
      activeClass: 'bg-[#e040fb30]',
      glowStyle: '0 0 30px #e040fb, 0 0 60px #e040fb55',
      shape: 'pill',
    },
    {
      id: 'reverb-scream',
      label: 'REVERB SCREAM',
      icon: '😱',
      subtext: 'AAAAAHHH!!!',
      color: '#f44336',
      textColor: 'text-[#ef5350]',
      bgClass: 'bg-[#f443360d]',
      borderClass: 'border-[#f44336]/50',
      activeClass: 'bg-[#f4433635]',
      glowStyle: '0 0 35px #f44336, 0 0 70px #f4433666',
      shape: 'sharp',
    },
    {
      id: 'dial-up',
      label: 'DIAL-UP MODEM',
      icon: '📠',
      subtext: 'krrrshhh...',
      color: '#78909c',
      textColor: 'text-[#90a4ae]',
      bgClass: 'bg-[#78909c0d]',
      borderClass: 'border-[#78909c]/40',
      activeClass: 'bg-[#78909c28]',
      glowStyle: '0 0 20px #78909c, 0 0 40px #78909c44',
      shape: 'sharp',
    },
    {
      id: 'cartoon-slip',
      label: 'CARTOON SLIP',
      icon: '🍌',
      subtext: 'wheee~',
      color: '#ffeb3b',
      textColor: 'text-[#fff176]',
      bgClass: 'bg-[#ffeb3b0d]',
      borderClass: 'border-[#ffeb3b]/40',
      activeClass: 'bg-[#ffeb3b28]',
      glowStyle: '0 0 25px #ffeb3b, 0 0 50px #ffeb3b55',
      shape: 'pill',
    },
    {
      id: 'evil-laugh',
      label: 'EVIL LAUGH',
      icon: '😈',
      subtext: 'MWAHAHAHA',
      color: '#7b1fa2',
      textColor: 'text-[#ce93d8]',
      bgClass: 'bg-[#7b1fa20d]',
      borderClass: 'border-[#7b1fa2]/50',
      activeClass: 'bg-[#7b1fa235]',
      glowStyle: '0 0 35px #9c27b0, 0 0 70px #7b1fa266',
      shape: 'sharp',
    },
    {
      id: 'clapping',
      label: 'CLAPPING',
      icon: '👏',
      subtext: 'clap clap clap',
      color: '#ffa726',
      textColor: 'text-[#ffb74d]',
      bgClass: 'bg-[#ffa7260d]',
      borderClass: 'border-[#ffa726]/40',
      activeClass: 'bg-[#ffa72630]',
      glowStyle: '0 0 25px #ffa726, 0 0 50px #ffa72655',
      shape: 'rounded',
    },
    {
      id: 'price-fail',
      label: 'PRICE IS RIGHT FAIL',
      icon: '💸',
      subtext: 'wah wah wah wah',
      color: '#26c6da',
      textColor: 'text-[#4dd0e1]',
      bgClass: 'bg-[#26c6da0d]',
      borderClass: 'border-[#26c6da]/40',
      activeClass: 'bg-[#26c6da28]',
      glowStyle: '0 0 25px #26c6da, 0 0 50px #26c6da55',
      shape: 'rounded',
    },
    {
      id: 'rimshot',
      label: 'RIMSHOT',
      icon: '🥁',
      subtext: 'ba dum tss',
      color: '#ff6a00',
      textColor: 'text-[#ff8c42]',
      bgClass: 'bg-[#ff6a000d]',
      borderClass: 'border-[#ff6a00]/40',
      activeClass: 'bg-[#ff6a0030]',
      glowStyle: '0 0 25px #ff6a00, 0 0 50px #ff6a0055',
      shape: 'rounded',
    },
    {
      id: 'whistle',
      label: 'WHISTLE',
      icon: '🎵',
      subtext: 'fweeeet~',
      color: '#80deea',
      textColor: 'text-[#80deea]',
      bgClass: 'bg-[#80deea0d]',
      borderClass: 'border-[#80deea]/35',
      activeClass: 'bg-[#80deea28]',
      glowStyle: '0 0 20px #80deea, 0 0 40px #80deea44',
      shape: 'pill',
    },
    {
      id: 'bubble-pop',
      label: 'BUBBLE POP',
      icon: '🫧',
      subtext: 'pop pop pop',
      color: '#40c4ff',
      textColor: 'text-[#81d4fa]',
      bgClass: 'bg-[#40c4ff0d]',
      borderClass: 'border-[#40c4ff]/35',
      activeClass: 'bg-[#40c4ff28]',
      glowStyle: '0 0 20px #40c4ff, 0 0 40px #40c4ff44',
      shape: 'pill',
    },
    {
      id: 'nom-nom',
      label: 'NOM NOM',
      icon: '😋',
      subtext: 'nom nom nom',
      color: '#ff8f00',
      textColor: 'text-[#ffb300]',
      bgClass: 'bg-[#ff8f000d]',
      borderClass: 'border-[#ff8f00]/40',
      activeClass: 'bg-[#ff8f0030]',
      glowStyle: '0 0 25px #ff8f00, 0 0 50px #ff8f0055',
      shape: 'rounded',
    },
    {
      id: 'mario-jump',
      label: 'MARIO JUMP',
      icon: '🍄',
      subtext: '⭐ wahoo!',
      color: '#e53935',
      textColor: 'text-[#ef5350]',
      bgClass: 'bg-[#e539350d]',
      borderClass: 'border-[#e53935]/40',
      activeClass: 'bg-[#e5393530]',
      glowStyle: '0 0 25px #e53935, 0 0 50px #e5393555',
      shape: 'rounded',
    },
    {
      id: 'six-seven',
      label: '67',
      icon: '🔥',
      subtext: 'SIX SEVEN',
      color: '#ff6a00',
      textColor: 'text-[#ff6a00]',
      bgClass: 'bg-[#ff6a000d]',
      borderClass: 'border-[#ff6a00]/60',
      activeClass: 'bg-[#ff6a0035]',
      glowStyle: '0 0 40px #ff6a00, 0 0 80px #ff6a0077, 0 0 120px #ff6a0033',
      shape: 'sharp',
    },
  ];

  const plays: Record<string, () => void> = {
    airhorn: sounds.playAirhorn,
    fart: sounds.playFart,
    bruh: sounds.playBruh,
    'sad-trombone': sounds.playSadTrombone,
    crickets: sounds.playCrickets,
    wow: sounds.playWow,
    oof: sounds.playOof,
    'glass-break': sounds.playGlassBreak,
    boing: sounds.playBoing,
    'reverb-scream': sounds.playReverbScream,
    'dial-up': sounds.playDialUpModem,
    'cartoon-slip': sounds.playCartoonSlip,
    'evil-laugh': sounds.playEvilLaugh,
    clapping: sounds.playClapping,
    'price-fail': sounds.playPriceIsRightFail,
    rimshot: sounds.playRimshot,
    whistle: sounds.playWhistle,
    'bubble-pop': sounds.playBubblePop,
    'nom-nom': sounds.playNomNom,
    'mario-jump': sounds.playSuperMarioJump,
    'six-seven': sounds.playSixSeven,
  };

  const getRadiusClass = (shape?: string) => {
    if (shape === 'sharp') return 'rounded-sm';
    if (shape === 'pill') return 'rounded-full';
    return 'rounded-xl';
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <div className="inline-block mb-3">
          <span className="font-chakra text-xs font-bold tracking-[0.3em] uppercase text-neon-cyan/60 border border-neon-cyan/30 px-3 py-1 rounded-sm">
            🎵 Sound Effects
          </span>
        </div>
        <h1 className="font-chakra text-4xl sm:text-5xl md:text-6xl font-black tracking-wider mb-3">
          <span className="neon-text-orange">KASH'S</span>
          {' '}
          <span className="neon-text-cyan">SOUNDPAD</span>
        </h1>
        <p className="font-exo text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
          Tap any button to unleash a hilarious sound effect. Go wild. 🔊
        </p>
      </div>

      {/* Sound Grid */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {soundButtons.map((btn) => {
            const isActive = activeButton === btn.id;
            const radiusClass = getRadiusClass(btn.shape);
            const isSixSeven = btn.id === 'six-seven';

            return (
              <button
                key={btn.id}
                onClick={() => triggerSound(btn.id, plays[btn.id])}
                className={[
                  'relative flex flex-col items-center justify-center gap-1.5 p-4 border-2 font-exo font-bold',
                  'transition-all duration-150 cursor-pointer select-none overflow-hidden',
                  'min-h-[100px] sm:min-h-[115px]',
                  radiusClass,
                  btn.textColor,
                  isActive ? btn.activeClass : btn.bgClass,
                  isActive ? 'border-current scale-95' : btn.borderClass,
                  isSixSeven ? 'col-span-1 sm:col-span-1' : '',
                ].join(' ')}
                style={isActive ? { boxShadow: btn.glowStyle } : undefined}
              >
                {/* Animated ping ring on active */}
                {isActive && (
                  <span
                    className={`absolute inset-0 ${radiusClass} border-2 border-current animate-ping opacity-50`}
                  />
                )}

                {/* Background shimmer on active */}
                {isActive && (
                  <span
                    className="absolute inset-0 opacity-10"
                    style={{
                      background: `radial-gradient(circle at center, ${btn.color} 0%, transparent 70%)`,
                    }}
                  />
                )}

                {/* Icon */}
                <span
                  className={[
                    'leading-none transition-transform duration-150',
                    isSixSeven ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
                    isActive ? 'scale-110' : 'scale-100',
                  ].join(' ')}
                >
                  {btn.icon}
                </span>

                {/* Label */}
                <span
                  className={[
                    'text-center leading-tight font-chakra tracking-wide uppercase',
                    isSixSeven ? 'text-base sm:text-lg font-black' : 'text-[10px] sm:text-xs',
                  ].join(' ')}
                >
                  {btn.label}
                </span>

                {/* Subtext */}
                {btn.subtext && (
                  <span
                    className={[
                      'font-exo italic opacity-60 leading-none',
                      isSixSeven ? 'text-xs tracking-[0.2em]' : 'text-[9px] sm:text-[10px]',
                    ].join(' ')}
                  >
                    {btn.subtext}
                  </span>
                )}

                {/* Bottom accent line */}
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
                  style={{ background: btn.color }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="max-w-5xl mx-auto mt-10 text-center">
        <p className="font-exo text-muted-foreground/50 text-xs tracking-widest uppercase">
          All sounds synthesized in real-time via Web Audio API — no downloads needed
        </p>
      </div>
    </div>
  );
}
