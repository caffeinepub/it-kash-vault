import React, { useRef, useEffect, useState, useCallback } from 'react';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
  scale: number;
  color: string;
}

const BEST_SCORE_KEY = 'sixSevenBestScore';
const COMBO_TIMEOUT = 1000;
const NEON_COLORS = ['#ffff00', '#ff10f0', '#00ffcc', '#ff6600', '#00cfff'];
const CLICK_TEXTS = ['67!', 'SIX SEVEN!', '6️⃣7️⃣', 'SIXTY SEVEN!', '67!!', 'SIX!', 'SEVEN!'];

export default function SixSevenGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const comboRef = useRef(1);
  const lastClickTimeRef = useRef(0);
  const clickAnimRef = useRef(0);
  const pulseRef = useRef(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const shakeRef = useRef(0);
  const flashRef = useRef(0);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(1);

  // Load best score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val)) {
        bestScoreRef.current = val;
        setBestScore(val);
      }
    }
  }, []);

  const draw67Character = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      clickAnim: number,
      pulse: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);

      const s = 1 + clickAnim * 0.15 + Math.sin(pulse) * 0.04;
      ctx.scale(s, s);

      const glowIntensity = 15 + clickAnim * 40 + Math.sin(pulse) * 8;

      // Outer glow ring
      const ringR = 110 + Math.sin(pulse) * 5;
      const ringGrad = ctx.createRadialGradient(0, 0, ringR * 0.7, 0, 0, ringR);
      ringGrad.addColorStop(0, `rgba(255, 255, 0, ${0.08 + clickAnim * 0.15})`);
      ringGrad.addColorStop(1, 'rgba(255, 16, 240, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.fillStyle = ringGrad;
      ctx.fill();

      // Pulsing circle background
      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      const bgGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 95);
      bgGrad.addColorStop(0, '#1a0a00');
      bgGrad.addColorStop(0.6, '#0d0520');
      bgGrad.addColorStop(1, '#050010');
      ctx.fillStyle = bgGrad;
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = clickAnim > 0.1 ? '#ff10f0' : '#ffff00';
      ctx.fill();

      // Circle border
      ctx.strokeStyle = clickAnim > 0.1 ? '#ff10f0' : '#ffff00';
      ctx.lineWidth = 3 + clickAnim * 2;
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = clickAnim > 0.1 ? '#ff10f0' : '#ffff00';
      ctx.stroke();

      // Inner decorative ring
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 16, 240, ${0.3 + clickAnim * 0.4})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff10f0';
      ctx.stroke();

      // Draw "67" text
      ctx.shadowBlur = 30 + clickAnim * 30;
      ctx.shadowColor = clickAnim > 0.1 ? '#ff10f0' : '#ffff00';
      ctx.font = `900 72px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text outline
      ctx.strokeStyle = clickAnim > 0.1 ? '#ff10f0' : '#ffff00';
      ctx.lineWidth = 4;
      ctx.strokeText('67', 0, -8);

      // Text fill
      const textGrad = ctx.createLinearGradient(0, -50, 0, 40);
      if (clickAnim > 0.1) {
        textGrad.addColorStop(0, '#ff10f0');
        textGrad.addColorStop(0.5, '#ffffff');
        textGrad.addColorStop(1, '#ff10f0');
      } else {
        textGrad.addColorStop(0, '#ffff00');
        textGrad.addColorStop(0.5, '#ffffff');
        textGrad.addColorStop(1, '#ffaa00');
      }
      ctx.fillStyle = textGrad;
      ctx.fillText('67', 0, -8);

      // "SIX SEVEN" subtitle
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ffcc';
      ctx.font = `bold 14px 'Orbitron', monospace`;
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('SIX SEVEN', 0, 52);

      // Click ripple
      if (clickAnim > 0.05) {
        const rippleR = (1 - clickAnim) * 140;
        ctx.beginPath();
        ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 16, 240, ${clickAnim * 0.9})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff10f0';
        ctx.stroke();

        // Second ripple
        const rippleR2 = (1 - clickAnim) * 100;
        ctx.beginPath();
        ctx.arc(0, 0, rippleR2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 0, ${clickAnim * 0.6})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffff00';
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Shake offset
    const shakeX = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 6 : 0;
    const shakeY = shakeRef.current > 0 ? (Math.random() - 0.5) * shakeRef.current * 4 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background
    ctx.clearRect(-10, -10, W + 20, H + 20);
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.9);
    bgGrad.addColorStop(0, '#0d0520');
    bgGrad.addColorStop(1, '#050010');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Flash overlay on click
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(255, 255, 0, ${flashRef.current * 0.12})`;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 16, 240, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Combo ring
    if (comboRef.current > 1) {
      const ringR = 120 + comboRef.current * 6;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 0, ${Math.min(comboRef.current * 0.06, 0.5)})`;
      ctx.lineWidth = comboRef.current * 1.5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffff00';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw 67 character
    draw67Character(ctx, W / 2, H / 2, clickAnimRef.current, pulseRef.current);

    // Floating texts
    floatingTextsRef.current.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.font = `bold ${Math.round(22 * ft.scale)}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // Combo display on canvas
    if (comboRef.current > 1) {
      ctx.save();
      ctx.font = `bold 16px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffff00';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffff00';
      ctx.fillText(`x${comboRef.current} COMBO`, W / 2, H - 28);
      ctx.restore();
    }

    ctx.restore();
  }, [draw67Character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      clickAnimRef.current = Math.max(0, clickAnimRef.current - dt * 0.004);
      shakeRef.current = Math.max(0, shakeRef.current - dt * 0.005);
      flashRef.current = Math.max(0, flashRef.current - dt * 0.006);
      pulseRef.current += dt * 0.002;

      const now = Date.now();
      if (comboRef.current > 1 && now - lastClickTimeRef.current > COMBO_TIMEOUT) {
        comboRef.current = 1;
        setCombo(1);
      }

      floatingTextsRef.current = floatingTextsRef.current
        .map((ft) => ({
          ...ft,
          y: ft.y + ft.vy * (dt / 16),
          opacity: ft.opacity - 0.016 * (dt / 16),
        }))
        .filter((ft) => ft.opacity > 0);

      drawScene();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [drawScene]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const now = Date.now();
      const timeSinceLast = now - lastClickTimeRef.current;

      if (timeSinceLast < COMBO_TIMEOUT) {
        comboRef.current = Math.min(comboRef.current + 1, 20);
      } else {
        comboRef.current = 1;
      }
      lastClickTimeRef.current = now;

      const points = comboRef.current;
      scoreRef.current += points;
      if (scoreRef.current > bestScoreRef.current) {
        bestScoreRef.current = scoreRef.current;
        setBestScore(scoreRef.current);
        localStorage.setItem(BEST_SCORE_KEY, String(scoreRef.current));
      }
      setScore(scoreRef.current);
      setCombo(comboRef.current);

      clickAnimRef.current = 1;
      flashRef.current = 1;
      shakeRef.current = Math.min(comboRef.current * 0.25, 3);

      let clickX = canvas.width / 2;
      let clickY = canvas.height / 2 - 80;
      if ('touches' in e && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        clickX = e.touches[0].clientX - rect.left;
        clickY = e.touches[0].clientY - rect.top - 40;
      } else if ('clientX' in e) {
        const rect = canvas.getBoundingClientRect();
        clickX = (e as React.MouseEvent).clientX - rect.left;
        clickY = (e as React.MouseEvent).clientY - rect.top - 40;
      }

      let text = '67!';
      if (comboRef.current >= 15) text = 'SIXTY SEVEN!!!';
      else if (comboRef.current >= 10) text = 'SIX SEVEN!!!';
      else if (comboRef.current >= 7) text = 'SIXTY SEVEN!';
      else if (comboRef.current >= 5) text = 'SIX SEVEN!';
      else if (comboRef.current >= 3) text = '67!!';
      else text = CLICK_TEXTS[Math.floor(Math.random() * 3)];

      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      const scale = 1 + Math.min(comboRef.current * 0.07, 1.0);

      floatingTextsRef.current.push({
        id: nextIdRef.current++,
        x: clickX + (Math.random() - 0.5) * 70,
        y: clickY,
        text,
        opacity: 1,
        vy: -1.5 - Math.random() * 1.2,
        scale,
        color,
      });

      if (floatingTextsRef.current.length > 15) {
        floatingTextsRef.current = floatingTextsRef.current.slice(-15);
      }
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Score display */}
      <div className="flex gap-6 w-full max-w-lg justify-center flex-wrap">
        <div className="flex flex-col items-center bg-card/60 border border-yellow-400/40 rounded-xl px-6 py-3"
          style={{ boxShadow: '0 0 12px rgba(255,255,0,0.2)' }}>
          <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Score</span>
          <span className="font-orbitron text-3xl font-bold text-yellow-400"
            style={{ textShadow: '0 0 12px #ffff00' }}>{score}</span>
        </div>
        <div className="flex flex-col items-center bg-card/60 border border-neon-pink/30 rounded-xl px-6 py-3">
          <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Best</span>
          <span className="font-orbitron text-3xl font-bold neon-text-pink">{bestScore}</span>
        </div>
        {combo > 1 && (
          <div className="flex flex-col items-center bg-card/60 border border-yellow-400/40 rounded-xl px-6 py-3 animate-pulse">
            <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Combo</span>
            <span className="font-orbitron text-3xl font-bold text-yellow-400">x{combo}</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border-2 border-yellow-400/30"
        style={{ height: '420px', cursor: 'pointer', boxShadow: '0 0 30px rgba(255,255,0,0.1)' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
          onClick={handleClick}
          onTouchStart={handleClick}
        />
      </div>

      {/* Instructions */}
      <div className="text-center max-w-md">
        <p className="font-rajdhani text-muted-foreground text-sm">
          <span className="text-yellow-400 font-semibold">Click / Tap</span> the{' '}
          <span className="font-orbitron text-yellow-400">67</span> to score!
          Click rapidly for a{' '}
          <span className="font-semibold" style={{ color: '#ff10f0' }}>COMBO multiplier</span>.
          Combo resets after 1 second of no clicking.
        </p>
      </div>
    </div>
  );
}
