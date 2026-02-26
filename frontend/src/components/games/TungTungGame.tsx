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

export default function TungTungGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const comboRef = useRef(1);
  const lastClickTimeRef = useRef(0);
  const clickAnimRef = useRef(0); // 0-1, 1 = just clicked
  const pulseRef = useRef(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextIdRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const shakeRef = useRef(0);
  const characterImgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(1);

  const COMBO_TIMEOUT = 1000; // ms

  const TUNG_TEXTS = ['TUNG!', 'TUNG TUNG!', 'SAHUR!', 'TUNG TUNG TUNG!', 'BOOM!', 'TUNG!'];
  const NEON_COLORS = ['#00ffcc', '#ff2d78', '#ffe600', '#00cfff', '#b400ff'];

  // Preload character image
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/generated/tung-character.dim_300x300.png';
    img.onload = () => {
      characterImgRef.current = img;
      imgLoadedRef.current = true;
    };
  }, []);

  const drawCharacter = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      clickAnim: number,
      pulse: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);

      const s = 1 + clickAnim * 0.12 + Math.sin(pulse) * 0.03;
      ctx.scale(s, s);

      // Tilt/rotate on click for impact feel
      const tilt = clickAnim * 0.15 * (Math.random() > 0.5 ? 1 : -1);
      if (clickAnim > 0.05) ctx.rotate(tilt);

      const imgSize = 220;
      const halfSize = imgSize / 2;

      // Glow effect behind character
      const glowIntensity = 15 + clickAnim * 40 + Math.sin(pulse) * 6;
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = clickAnim > 0.1 ? '#ff2d78' : '#ffe600';

      if (imgLoadedRef.current && characterImgRef.current) {
        // Draw the character image centered
        ctx.drawImage(characterImgRef.current, -halfSize, -halfSize, imgSize, imgSize);
      } else {
        // Fallback: draw a placeholder circle while image loads
        ctx.beginPath();
        ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
        ctx.fillStyle = '#2d1060';
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = `bold 20px 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe600';
        ctx.fillText('TUNG', 0, 8);
      }

      // Click flash overlay
      if (clickAnim > 0.05) {
        ctx.globalAlpha = clickAnim * 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, halfSize + 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ff2d78';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Click ripple effect
      if (clickAnim > 0.05) {
        const rippleR = (1 - clickAnim) * 160;
        ctx.beginPath();
        ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 45, 120, ${clickAnim * 0.7})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff2d78';
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
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
    bgGrad.addColorStop(0, '#1a0d00');
    bgGrad.addColorStop(1, '#050010');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 180, 0, 0.06)';
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
      const ringR = 120 + comboRef.current * 8;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 + 10, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 230, 0, ${Math.min(comboRef.current * 0.08, 0.5)})`;
      ctx.lineWidth = comboRef.current * 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffe600';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw character
    drawCharacter(ctx, W / 2, H / 2 + 10, clickAnimRef.current, pulseRef.current);

    // Floating texts
    floatingTextsRef.current.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = ft.opacity;
      ctx.font = `bold ${Math.round(24 * ft.scale)}px 'Orbitron', monospace`;
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
      ctx.font = `bold 18px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe600';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffe600';
      ctx.fillText(`x${comboRef.current} COMBO`, W / 2, H - 30);
      ctx.restore();
    }

    ctx.restore();
  }, [drawCharacter]);

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

      // Decay click animation
      clickAnimRef.current = Math.max(0, clickAnimRef.current - dt * 0.004);
      // Decay shake
      shakeRef.current = Math.max(0, shakeRef.current - dt * 0.005);
      // Advance pulse
      pulseRef.current += dt * 0.002;

      // Check combo timeout
      const now = Date.now();
      if (comboRef.current > 1 && now - lastClickTimeRef.current > COMBO_TIMEOUT) {
        comboRef.current = 1;
        setCombo(1);
      }

      // Update floating texts
      floatingTextsRef.current = floatingTextsRef.current
        .map((ft) => ({
          ...ft,
          y: ft.y + ft.vy * (dt / 16),
          opacity: ft.opacity - 0.018 * (dt / 16),
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

      // Update combo
      if (timeSinceLast < COMBO_TIMEOUT) {
        comboRef.current = Math.min(comboRef.current + 1, 20);
      } else {
        comboRef.current = 1;
      }
      lastClickTimeRef.current = now;

      // Update score
      const points = comboRef.current;
      scoreRef.current += points;
      if (scoreRef.current > bestScoreRef.current) {
        bestScoreRef.current = scoreRef.current;
        setBestScore(scoreRef.current);
      }
      setScore(scoreRef.current);
      setCombo(comboRef.current);

      // Trigger animations
      clickAnimRef.current = 1;
      shakeRef.current = Math.min(comboRef.current * 0.3, 3);

      // Get click position for floating text
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

      // Pick text
      let text = 'TUNG!';
      if (comboRef.current >= 10) text = 'TUNG TUNG TUNG!';
      else if (comboRef.current >= 5) text = 'SAHUR!';
      else if (comboRef.current >= 3) text = 'TUNG TUNG!';
      else text = TUNG_TEXTS[Math.floor(Math.random() * 3)];

      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      const scale = 1 + Math.min(comboRef.current * 0.08, 1.2);

      floatingTextsRef.current.push({
        id: nextIdRef.current++,
        x: clickX + (Math.random() - 0.5) * 60,
        y: clickY,
        text,
        opacity: 1,
        vy: -1.5 - Math.random() * 1,
        scale,
        color,
      });

      // Limit floating texts
      if (floatingTextsRef.current.length > 15) {
        floatingTextsRef.current = floatingTextsRef.current.slice(-15);
      }
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Score display */}
      <div className="flex gap-8 w-full max-w-lg justify-center">
        <div className="flex flex-col items-center bg-card/60 border border-neon-cyan/30 rounded-xl px-6 py-3 neon-glow-cyan">
          <span className="font-rajdhani text-xs text-muted-foreground uppercase tracking-widest">Score</span>
          <span className="font-orbitron text-3xl font-bold neon-text-cyan">{score}</span>
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
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border-2 border-yellow-500/40"
        style={{ height: '420px', cursor: 'pointer' }}
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
          <span className="text-neon-cyan font-semibold">Click / Tap</span> Tung Tung Tung to score!
          Click rapidly for a <span className="text-yellow-400 font-semibold">COMBO multiplier</span>.
          Combo resets after 1 second of no clicking.
        </p>
      </div>
    </div>
  );
}
