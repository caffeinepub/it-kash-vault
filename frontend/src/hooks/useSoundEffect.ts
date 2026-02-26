import { useRef, useCallback } from 'react';

export function useSoundEffect() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Simple oscillator tone with ADSR envelope
  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.3,
    startTime?: number
  ) => {
    try {
      const ctx = getCtx();
      const t = startTime ?? ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  // Frequency sweep
  const playSweep = useCallback((
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sawtooth',
    volume = 0.3
  ) => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  // Noise burst (for impacts, explosions)
  const playNoise = useCallback((
    duration: number,
    volume = 0.3,
    filterFreq = 2000,
    startTime?: number
  ) => {
    try {
      const ctx = getCtx();
      const t = startTime ?? ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + duration + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  // ─── Retro Bowl sounds ───────────────────────────────────────────────────

  const playPassThrow = useCallback(() => {
    playSweep(300, 800, 0.15, 'sine', 0.25);
  }, [playSweep]);

  const playPassCaught = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(523, 0.12, 'sine', 0.3, t);
      playTone(659, 0.12, 'sine', 0.3, t + 0.1);
      playTone(784, 0.2, 'sine', 0.3, t + 0.2);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  const playPassIncomplete = useCallback(() => {
    playSweep(600, 200, 0.25, 'sawtooth', 0.2);
  }, [playSweep]);

  const playRunGain = useCallback(() => {
    playTone(440, 0.1, 'square', 0.2);
  }, [playTone]);

  const playTackle = useCallback(() => {
    playNoise(0.15, 0.35, 800);
  }, [playNoise]);

  const playTouchdown = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        playTone(freq, 0.25, 'square', 0.3, t + i * 0.12);
      });
      playNoise(0.3, 0.2, 3000, t + 0.48);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playFieldGoalGood = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(440, 0.15, 'sine', 0.3, t);
      playTone(554, 0.15, 'sine', 0.3, t + 0.15);
      playTone(659, 0.3, 'sine', 0.3, t + 0.3);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  const playFieldGoalMiss = useCallback(() => {
    playSweep(400, 150, 0.4, 'sawtooth', 0.25);
  }, [playSweep]);

  const playTurnover = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(300, 0.15, 'sawtooth', 0.3, t);
      playTone(200, 0.3, 'sawtooth', 0.3, t + 0.15);
      playNoise(0.2, 0.2, 600, t + 0.1);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playGameEndWhistle = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1100, t + 0.15);
      osc.frequency.setValueAtTime(880, t + 0.3);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.setValueAtTime(0.4, t + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.85);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  // ─── Dino Runner sounds ──────────────────────────────────────────────────

  const playDinoJump = useCallback(() => {
    playSweep(200, 500, 0.15, 'sine', 0.25);
  }, [playSweep]);

  const playDinoLand = useCallback(() => {
    playNoise(0.08, 0.25, 400);
  }, [playNoise]);

  const playDinoGameOver = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.1, 0.5, 1500, t);
      playTone(200, 0.3, 'sawtooth', 0.3, t + 0.05);
      playTone(150, 0.4, 'sawtooth', 0.3, t + 0.2);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playDinoMilestone = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(880, 0.08, 'square', 0.2, t);
      playTone(1100, 0.08, 'square', 0.2, t + 0.08);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  // ─── Asteroids sounds ────────────────────────────────────────────────────

  const playLaser = useCallback(() => {
    playSweep(800, 200, 0.12, 'sawtooth', 0.2);
  }, [playSweep]);

  const playLargeExplosion = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.5, 0.5, 600, t);
      playTone(80, 0.4, 'sawtooth', 0.3, t);
      playTone(60, 0.5, 'sine', 0.2, t + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playSmallExplosion = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.2, 0.3, 1500, t);
      playTone(300, 0.15, 'square', 0.2, t);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  // Returns a stop function for the thrust hum
  const startThrust = useCallback((): (() => void) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      osc.start();
      return () => {
        try {
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.stop(now + 0.15);
        } catch (_) { /* ignore */ }
      };
    } catch (_) {
      return () => { /* ignore */ };
    }
  }, [getCtx]);

  const playShipExplosion = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.8, 0.6, 800, t);
      playTone(100, 0.5, 'sawtooth', 0.4, t);
      playTone(150, 0.4, 'sawtooth', 0.3, t + 0.1);
      playTone(80, 0.6, 'sine', 0.3, t + 0.2);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  // ─── Swords & Sandals sounds ─────────────────────────────────────────────

  const playSwordHit = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playSweep(600, 200, 0.1, 'sawtooth', 0.25);
      playNoise(0.1, 0.3, 2000, t + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx, playSweep, playNoise]);

  const playBlock = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.12, 0.4, 3000, t);
      playTone(400, 0.15, 'square', 0.2, t);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playSpecialMove = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      [220, 330, 440, 660, 880].forEach((freq, i) => {
        playTone(freq, 0.2, 'sawtooth', 0.25, t + i * 0.08);
      });
      playNoise(0.3, 0.3, 2500, t + 0.3);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone, playNoise]);

  const playEnemyHit = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playSweep(500, 150, 0.12, 'square', 0.2);
      playNoise(0.1, 0.25, 1500, t + 0.05);
    } catch (_) { /* ignore */ }
  }, [getCtx, playSweep, playNoise]);

  const playVictoryFanfare = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const melody = [523, 659, 784, 659, 784, 1047];
      melody.forEach((freq, i) => {
        playTone(freq, 0.2, 'square', 0.3, t + i * 0.13);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  const playDefeatSound = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      [400, 300, 200, 150].forEach((freq, i) => {
        playTone(freq, 0.25, 'sawtooth', 0.25, t + i * 0.15);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  // ─── Whack-a-Mole sounds ─────────────────────────────────────────────────

  const playMolePop = useCallback(() => {
    playSweep(300, 600, 0.1, 'sine', 0.2);
  }, [playSweep]);

  const playWhack = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.1, 0.4, 2000, t);
      playSweep(500, 200, 0.15, 'square', 0.25);
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise, playSweep]);

  const playMoleRetreat = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playNoise(0.08, 0.15, 4000, t);
      playSweep(400, 100, 0.12, 'sine', 0.15);
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise, playSweep]);

  const playGameOver = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(440, 0.15, 'square', 0.3, t);
      playTone(330, 0.15, 'square', 0.3, t + 0.15);
      playTone(220, 0.4, 'sawtooth', 0.3, t + 0.3);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  // ─── Pong sounds ─────────────────────────────────────────────────────────

  const playPaddleHit = useCallback(() => {
    playTone(440, 0.06, 'square', 0.25);
  }, [playTone]);

  const playWallBounce = useCallback(() => {
    playTone(600, 0.05, 'square', 0.2);
  }, [playTone]);

  const playPointScored = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      playTone(523, 0.1, 'square', 0.3, t);
      playTone(784, 0.15, 'square', 0.3, t + 0.1);
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  const playWinFanfare = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const notes = [523, 659, 784, 1047, 784, 1047];
      notes.forEach((freq, i) => {
        playTone(freq, 0.18, 'square', 0.3, t + i * 0.1);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx, playTone]);

  // ─── Funny Soundpad sounds ───────────────────────────────────────────────

  const playFart = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.6);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.5);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + 0.65);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playAirhorn = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const freqs = [233, 466, 699];
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.setValueAtTime(0.25, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.start(t);
        osc.stop(t + 1.25);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playBruh = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(130, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
      gain.gain.setValueAtTime(0.4, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playSadTrombone = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const notes = [466, 415, 370, 311];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const start = t + i * 0.22;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.linearRampToValueAtTime(freq * 0.92, start + 0.2);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
        gain.gain.setValueAtTime(0.3, start + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playCrickets = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      for (let chirp = 0; chirp < 6; chirp++) {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4200 + Math.random() * 200, t);
          const start = t + chirp * 0.35 + i * 0.06;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
          osc.start(start);
          osc.stop(start + 0.06);
        }
      }
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playWow = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.6);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
      gain.gain.setValueAtTime(0.4, t + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.start(t);
      osc.stop(t + 0.75);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playOof = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
      gain.gain.setValueAtTime(0.35, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playGlassBreak = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // High-freq noise burst
      playNoise(0.05, 0.6, 8000, t);
      playNoise(0.3, 0.4, 5000, t + 0.03);
      playNoise(0.5, 0.2, 2000, t + 0.05);
      // Tinkle tones
      [2000, 3000, 1500, 2500].forEach((freq, i) => {
        playTone(freq, 0.08, 'sine', 0.15, t + i * 0.04);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise, playTone]);

  const playBoing = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.5);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playReverbScream = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // Layered sweeps to simulate a scream with reverb tail
      [600, 800, 1000, 700].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const start = t + i * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.linearRampToValueAtTime(freq * 1.3, start + 0.15);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + 0.6);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
        osc.start(start);
        osc.stop(start + 0.75);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playDialUpModem = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const tones = [
        [1300, 2100], [2100, 1300], [1300, 2100],
        [800, 1600], [1600, 800], [800, 1600],
        [1200, 2400], [2400, 1200],
      ];
      tones.forEach(([start, end], i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const s = t + i * 0.18;
        osc.frequency.setValueAtTime(start, s);
        osc.frequency.linearRampToValueAtTime(end, s + 0.16);
        gain.gain.setValueAtTime(0.2, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.18);
        osc.start(s);
        osc.stop(s + 0.2);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playCartoonSlip = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // Descending glide
      playSweep(1200, 200, 0.3, 'sine', 0.3);
      // Impact thud
      playNoise(0.15, 0.5, 400, t + 0.28);
      playTone(80, 0.2, 'sine', 0.4, t + 0.28);
    } catch (_) { /* ignore */ }
  }, [getCtx, playSweep, playNoise, playTone]);

  const playEvilLaugh = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // "Ha ha ha" pattern
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const start = t + i * 0.22;
        osc.frequency.setValueAtTime(180 + i * 10, start);
        osc.frequency.linearRampToValueAtTime(220 + i * 10, start + 0.1);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.start(start);
        osc.stop(start + 0.2);
      }
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playClapping = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      for (let i = 0; i < 8; i++) {
        playNoise(0.06, 0.4, 3000, t + i * 0.18);
      }
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise]);

  const playPriceIsRightFail = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // Descending "wah wah wah wahhh"
      const notes = [466, 415, 370, 311, 277];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        const start = t + i * 0.25;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.linearRampToValueAtTime(freq * 0.88, start + 0.22);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.28, start + 0.03);
        gain.gain.setValueAtTime(0.28, start + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playRimshot = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      // Snare hit
      playNoise(0.08, 0.5, 5000, t);
      playTone(200, 0.06, 'square', 0.3, t);
      // Cymbal
      playNoise(0.3, 0.3, 8000, t + 0.06);
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise, playTone]);

  const playWhistle = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.linearRampToValueAtTime(2200, t + 0.1);
      osc.frequency.setValueAtTime(2200, t + 0.15);
      osc.frequency.linearRampToValueAtTime(1600, t + 0.35);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.setValueAtTime(0.3, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.45);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playBubblePop = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  const playNomNom = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const start = t + i * 0.15;
        playNoise(0.06, 0.3, 1500, start);
        playTone(300 + i * 20, 0.08, 'sine', 0.2, start + 0.02);
      }
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise, playTone]);

  const playSuperMarioJump = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.exponentialRampToValueAtTime(1046, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (_) { /* ignore */ }
  }, [getCtx]);

  // ─── 67 sound ────────────────────────────────────────────────────────────

  const playSixSeven = useCallback(() => {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime;

      // "Six" — punchy rising tone with a bit of grit
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(220, t);
      osc1.frequency.exponentialRampToValueAtTime(440, t + 0.12);
      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain1.gain.setValueAtTime(0.4, t + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc1.start(t);
      osc1.stop(t + 0.2);

      // Brief noise hit between the two numbers
      playNoise(0.05, 0.25, 2000, t + 0.14);

      // "Seven" — descending neon sweep with hot-pink character
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(660, t + 0.2);
      osc2.frequency.exponentialRampToValueAtTime(220, t + 0.55);
      gain2.gain.setValueAtTime(0, t + 0.2);
      gain2.gain.linearRampToValueAtTime(0.45, t + 0.22);
      gain2.gain.setValueAtTime(0.45, t + 0.42);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc2.start(t + 0.2);
      osc2.stop(t + 0.65);

      // Harmonic layer for the "seven" — adds neon shimmer
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1320, t + 0.2);
      osc3.frequency.exponentialRampToValueAtTime(440, t + 0.55);
      gain3.gain.setValueAtTime(0, t + 0.2);
      gain3.gain.linearRampToValueAtTime(0.15, t + 0.22);
      gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc3.start(t + 0.2);
      osc3.stop(t + 0.65);

      // Final punchy tail noise
      playNoise(0.12, 0.2, 1200, t + 0.55);
    } catch (_) { /* ignore */ }
  }, [getCtx, playNoise]);

  return {
    // Retro Bowl
    playPassThrow,
    playPassCaught,
    playPassIncomplete,
    playRunGain,
    playTackle,
    playTouchdown,
    playFieldGoalGood,
    playFieldGoalMiss,
    playTurnover,
    playGameEndWhistle,
    // Dino Runner
    playDinoJump,
    playDinoLand,
    playDinoGameOver,
    playDinoMilestone,
    // Asteroids
    playLaser,
    playLargeExplosion,
    playSmallExplosion,
    startThrust,
    playShipExplosion,
    // Swords & Sandals
    playSwordHit,
    playBlock,
    playSpecialMove,
    playEnemyHit,
    playVictoryFanfare,
    playDefeatSound,
    // Whack-a-Mole
    playMolePop,
    playWhack,
    playMoleRetreat,
    playGameOver,
    // Pong
    playPaddleHit,
    playWallBounce,
    playPointScored,
    playWinFanfare,
    // Funny Soundpad
    playFart,
    playAirhorn,
    playBruh,
    playSadTrombone,
    playCrickets,
    playWow,
    playOof,
    playGlassBreak,
    playBoing,
    playReverbScream,
    playDialUpModem,
    playCartoonSlip,
    playEvilLaugh,
    playClapping,
    playPriceIsRightFail,
    playRimshot,
    playWhistle,
    playBubblePop,
    playNomNom,
    playSuperMarioJump,
    // 67
    playSixSeven,
  };
}
