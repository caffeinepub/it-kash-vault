import React, { useRef, useEffect, useCallback, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number; }

type RouteType = 'slant' | 'out' | 'post' | 'curl' | 'go' | 'corner' | 'flat';

interface Player {
  pos: Vec2;
  vel: Vec2;
  targetPos: Vec2;
  routePoints: Vec2[];
  routeIndex: number;
  routeType: RouteType;
  id: number;
  label: string;
  bodyColor: string;
  helmetColor: string;
  isSelected: boolean;
  hasBall: boolean;
  isTackled: boolean;
  tackleTimer: number;
  isDefender: boolean;
  speed: number;
  coveringReceiver: number;
  number: number;
  facingRight: boolean;
}

interface Ball {
  pos: Vec2;
  vel: Vec2;
  active: boolean;
  inFlight: boolean;
  progress: number;
  startPos: Vec2;
  endPos: Vec2;
  arcHeight: number;
  carrier: number;
  spin: number;
}

type GamePhase =
  | 'PLAY_CALL'
  | 'PRE_SNAP'
  | 'AIMING'
  | 'BALL_FLIGHT'
  | 'RUNNING'
  | 'RESULT'
  | 'FIELD_GOAL_ANIM'
  | 'CPU_PLAY'
  | 'HALFTIME'
  | 'EXTRA_POINT'
  | 'GAME_OVER';

interface GameState {
  phase: GamePhase;
  playerScore: number;
  cpuScore: number;
  quarter: number;
  quarterTime: number;
  down: number;
  yardsToGo: number;
  ballYardLine: number;
  firstDownLine: number;
  resultText: string;
  resultColor: string;
  resultTimer: number;
  players: Player[];
  defenders: Player[];
  ball: Ball;
  cpuPossession: boolean;
  cpuDriveYard: number;
  cpuDriveTimer: number;
  fgAnimTimer: number;
  fgSuccess: boolean;
  fgBallPos: Vec2;
  runCarrierIdx: number;
  interceptionOccurred: boolean;
  aimAngle: number;
  aimPower: number;
  isAiming: boolean;
  aimStartPos: Vec2 | null;
  extraPointAttempt: boolean;
  puntOccurred: boolean;
  playType: 'PASS' | 'RUN' | null;
  scrambleTimer: number;
  catchFlashTimer: number;
  catchFlashPos: Vec2 | null;
  tdFlashTimer: number;
}

// ─── Canvas Constants ─────────────────────────────────────────────────────────

const W = 720;
const H = 520;

const HUD_H = 56;
const FIELD_TOP = HUD_H;
const FIELD_BOTTOM = H - 50;
const FIELD_LEFT = 0;
const FIELD_RIGHT = W;
const FIELD_W = FIELD_RIGHT - FIELD_LEFT;
const FIELD_H = FIELD_BOTTOM - FIELD_TOP;

const EZ_W = 60;
const PLAY_LEFT = FIELD_LEFT + EZ_W;
const PLAY_RIGHT = FIELD_RIGHT - EZ_W;
const PLAY_W = PLAY_RIGHT - PLAY_LEFT;

// ─── Colors ───────────────────────────────────────────────────────────────────

const C_FIELD_GREEN = '#4caf50';
const C_FIELD_DARK = '#388e3c';
const C_EZ_HOME = '#1565c0';
const C_EZ_CPU = '#b71c1c';
const C_LINE_WHITE = '#ffffff';
const C_HASH = 'rgba(255,255,255,0.5)';
const C_FIRST_DOWN = '#ffeb3b';
const C_HUD_BG = '#1a1a2e';
const C_HUD_BORDER = '#ff6b00';
const C_CROWD = '#2d1b4e';

const C_HOME_BODY = '#1565c0';
const C_HOME_HELMET = '#0d47a1';
const C_AWAY_BODY = '#c62828';
const C_AWAY_HELMET = '#b71c1c';
const C_BALL = '#c8860a';
const C_BALL_LACE = '#ffffff';
const C_SHADOW = 'rgba(0,0,0,0.25)';
const C_AIM_LINE = '#ffffff';
const C_AIM_DOT = '#ffeb3b';

const C_RESULT_GOOD = '#00e676';
const C_RESULT_BAD = '#ff1744';
const C_RESULT_NEUTRAL = '#ffeb3b';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function randBetween(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function randInt(lo: number, hi: number) { return Math.floor(lo + Math.random() * (hi - lo + 1)); }
function dist(a: Vec2, b: Vec2) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function normalize(v: Vec2): Vec2 {
  const d = Math.sqrt(v.x * v.x + v.y * v.y);
  if (d < 0.001) return { x: 0, y: 0 };
  return { x: v.x / d, y: v.y / d };
}
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function yardToX(yard: number): number {
  return PLAY_LEFT + (yard / 100) * PLAY_W;
}
function xToYard(x: number): number {
  return clamp(((x - PLAY_LEFT) / PLAY_W) * 100, 0, 100);
}
function fieldCenterY(): number {
  return FIELD_TOP + FIELD_H / 2;
}
function fieldY(frac: number): number {
  return FIELD_TOP + frac * FIELD_H;
}

// ─── Route Generation ─────────────────────────────────────────────────────────

function buildRoute(startX: number, startY: number, routeType: RouteType): Vec2[] {
  const pxPerYard = PLAY_W / 100;
  const pts: Vec2[] = [{ x: startX, y: startY }];
  const cy = fieldCenterY();

  switch (routeType) {
    case 'go':
      pts.push({ x: startX + 8 * pxPerYard, y: startY });
      pts.push({ x: startX + 20 * pxPerYard, y: startY });
      break;
    case 'slant': {
      pts.push({ x: startX + 4 * pxPerYard, y: startY });
      const dir = startY < cy ? 1 : -1;
      pts.push({ x: startX + 12 * pxPerYard, y: startY + dir * 45 });
      break;
    }
    case 'out': {
      pts.push({ x: startX + 8 * pxPerYard, y: startY });
      const dir = startY < cy ? -1 : 1;
      pts.push({ x: startX + 12 * pxPerYard, y: startY + dir * 55 });
      break;
    }
    case 'post': {
      pts.push({ x: startX + 8 * pxPerYard, y: startY });
      const dir = startY < cy ? 1 : -1;
      pts.push({ x: startX + 18 * pxPerYard, y: startY + dir * 40 });
      break;
    }
    case 'curl':
      pts.push({ x: startX + 10 * pxPerYard, y: startY });
      pts.push({ x: startX + 8 * pxPerYard, y: startY });
      break;
    case 'corner': {
      pts.push({ x: startX + 6 * pxPerYard, y: startY });
      const dir = startY < cy ? -1 : 1;
      pts.push({ x: startX + 14 * pxPerYard, y: startY + dir * 60 });
      break;
    }
    case 'flat': {
      const dir = startY < cy ? -1 : 1;
      pts.push({ x: startX + 3 * pxPerYard, y: startY + dir * 30 });
      pts.push({ x: startX + 8 * pxPerYard, y: startY + dir * 30 });
      break;
    }
  }

  return pts.map(p => ({
    x: clamp(p.x, PLAY_LEFT + 5, PLAY_RIGHT - 5),
    y: clamp(p.y, FIELD_TOP + 10, FIELD_BOTTOM - 10),
  }));
}

// ─── Player/Formation Setup ───────────────────────────────────────────────────

const ROUTE_TYPES: RouteType[] = ['slant', 'out', 'post', 'curl', 'go', 'corner', 'flat'];

function makeOffensePlayers(ballYard: number): Player[] {
  const qbX = yardToX(ballYard);
  const cy = fieldCenterY();
  const pxPerYard = PLAY_W / 100;

  const routes: RouteType[] = [
    ROUTE_TYPES[randInt(0, 6)],
    ROUTE_TYPES[randInt(0, 6)],
    ROUTE_TYPES[randInt(0, 6)],
  ];

  const qb: Player = {
    pos: { x: qbX, y: cy },
    vel: { x: 0, y: 0 },
    targetPos: { x: qbX, y: cy },
    routePoints: [{ x: qbX, y: cy }],
    routeIndex: 0,
    routeType: 'go',
    id: 0,
    label: 'QB',
    bodyColor: C_HOME_BODY,
    helmetColor: C_HOME_HELMET,
    isSelected: false,
    hasBall: true,
    isTackled: false,
    tackleTimer: 0,
    isDefender: false,
    speed: 2.2,
    coveringReceiver: -1,
    number: 12,
    facingRight: true,
  };

  const receiverYOffsets = [-85, 0, 85];
  const receiverNums = [80, 88, 17];
  const receivers: Player[] = [0, 1, 2].map((i) => {
    const startX = qbX - 1 * pxPerYard;
    const startY = clamp(cy + receiverYOffsets[i], FIELD_TOP + 18, FIELD_BOTTOM - 18);
    const routePts = buildRoute(startX, startY, routes[i]);
    return {
      pos: { x: startX, y: startY },
      vel: { x: 0, y: 0 },
      targetPos: routePts[1] || routePts[0],
      routePoints: routePts,
      routeIndex: 0,
      routeType: routes[i],
      id: i + 1,
      label: String.fromCharCode(65 + i),
      bodyColor: C_HOME_BODY,
      helmetColor: C_HOME_HELMET,
      isSelected: false,
      hasBall: false,
      isTackled: false,
      tackleTimer: 0,
      isDefender: false,
      speed: 3.0 + Math.random() * 0.5,
      coveringReceiver: -1,
      number: receiverNums[i],
      facingRight: true,
    };
  });

  // OL blockers
  const blockers: Player[] = [0, 1, 2].map((i) => {
    const bx = qbX - 2 * pxPerYard;
    const by = cy + (i - 1) * 22;
    return {
      pos: { x: bx, y: by },
      vel: { x: 0, y: 0 },
      targetPos: { x: bx, y: by },
      routePoints: [{ x: bx, y: by }],
      routeIndex: 0,
      routeType: 'go',
      id: 4 + i,
      label: 'O',
      bodyColor: C_HOME_BODY,
      helmetColor: C_HOME_HELMET,
      isSelected: false,
      hasBall: false,
      isTackled: false,
      tackleTimer: 0,
      isDefender: false,
      speed: 1.8,
      coveringReceiver: -1,
      number: 70 + i,
      facingRight: true,
    };
  });

  return [qb, ...receivers, ...blockers];
}

function makeDefenders(ballYard: number, offensePlayers: Player[]): Player[] {
  const qbX = yardToX(ballYard);
  const cy = fieldCenterY();
  const pxPerYard = PLAY_W / 100;
  const defenders: Player[] = [];

  // CBs covering receivers
  for (let i = 0; i < 3; i++) {
    const receiver = offensePlayers[i + 1];
    const cbX = receiver.pos.x + 7 * pxPerYard;
    const cbY = receiver.pos.y + randBetween(-8, 8);
    defenders.push({
      pos: { x: clamp(cbX, PLAY_LEFT + 5, PLAY_RIGHT - 5), y: clamp(cbY, FIELD_TOP + 10, FIELD_BOTTOM - 10) },
      vel: { x: 0, y: 0 },
      targetPos: { x: cbX, y: cbY },
      routePoints: [],
      routeIndex: 0,
      routeType: 'go',
      id: 10 + i,
      label: 'CB',
      bodyColor: C_AWAY_BODY,
      helmetColor: C_AWAY_HELMET,
      isSelected: false,
      hasBall: false,
      isTackled: false,
      tackleTimer: 0,
      isDefender: true,
      speed: 2.6 + Math.random() * 0.4,
      coveringReceiver: i + 1,
      number: 20 + i,
      facingRight: false,
    });
  }

  // LBs
  for (let i = 0; i < 2; i++) {
    const lbX = qbX + (5 + i * 4) * pxPerYard;
    const lbY = cy + (i === 0 ? -28 : 28);
    defenders.push({
      pos: { x: clamp(lbX, PLAY_LEFT + 5, PLAY_RIGHT - 5), y: clamp(lbY, FIELD_TOP + 10, FIELD_BOTTOM - 10) },
      vel: { x: 0, y: 0 },
      targetPos: { x: lbX, y: lbY },
      routePoints: [],
      routeIndex: 0,
      routeType: 'go',
      id: 13 + i,
      label: 'LB',
      bodyColor: C_AWAY_BODY,
      helmetColor: C_AWAY_HELMET,
      isSelected: false,
      hasBall: false,
      isTackled: false,
      tackleTimer: 0,
      isDefender: true,
      speed: 2.3 + Math.random() * 0.3,
      coveringReceiver: -1,
      number: 50 + i,
      facingRight: false,
    });
  }

  // Safety
  defenders.push({
    pos: { x: clamp(qbX + 22 * pxPerYard, PLAY_LEFT + 5, PLAY_RIGHT - 5), y: cy },
    vel: { x: 0, y: 0 },
    targetPos: { x: qbX + 22 * pxPerYard, y: cy },
    routePoints: [],
    routeIndex: 0,
    routeType: 'go',
    id: 15,
    label: 'S',
    bodyColor: C_AWAY_BODY,
    helmetColor: C_AWAY_HELMET,
    isSelected: false,
    hasBall: false,
    isTackled: false,
    tackleTimer: 0,
    isDefender: true,
    speed: 2.7,
    coveringReceiver: -1,
    number: 32,
    facingRight: false,
  });

  return defenders;
}

function makeInitialBall(ballYard: number): Ball {
  const x = yardToX(ballYard);
  const y = fieldCenterY();
  return {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    active: true,
    inFlight: false,
    progress: 0,
    startPos: { x, y },
    endPos: { x, y },
    arcHeight: 0,
    carrier: 0,
    spin: 0,
  };
}

function initialState(): GameState {
  const ballYard = 20;
  const players = makeOffensePlayers(ballYard);
  const defenders = makeDefenders(ballYard, players);
  return {
    phase: 'PLAY_CALL',
    playerScore: 0,
    cpuScore: 0,
    quarter: 1,
    quarterTime: 120,
    down: 1,
    yardsToGo: 10,
    ballYardLine: ballYard,
    firstDownLine: ballYard + 10,
    resultText: '',
    resultColor: C_RESULT_NEUTRAL,
    resultTimer: 0,
    players,
    defenders,
    ball: makeInitialBall(ballYard),
    cpuPossession: false,
    cpuDriveYard: 20,
    cpuDriveTimer: 0,
    fgAnimTimer: 0,
    fgSuccess: false,
    fgBallPos: { x: yardToX(ballYard), y: fieldCenterY() },
    runCarrierIdx: 0,
    interceptionOccurred: false,
    aimAngle: 0,
    aimPower: 0,
    isAiming: false,
    aimStartPos: null,
    extraPointAttempt: false,
    puntOccurred: false,
    playType: null,
    scrambleTimer: 0,
    catchFlashTimer: 0,
    catchFlashPos: null,
    tdFlashTimer: 0,
  };
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawCrowd(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C_CROWD;
  ctx.fillRect(0, FIELD_BOTTOM, W, H - FIELD_BOTTOM);

  const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#ff9800', '#4caf50', '#f44336'];
  for (let i = 0; i < 80; i++) {
    const cx = (i * 37 + 10) % W;
    const cy = FIELD_BOTTOM + 8 + (i % 3) * 12;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#111122';
  ctx.fillRect(0, FIELD_BOTTOM + 36, W, H - FIELD_BOTTOM - 36);
}

function drawField(ctx: CanvasRenderingContext2D, firstDownLine: number, ballYardLine: number, cpuPossession: boolean) {
  // Alternating green stripes
  const stripeW = PLAY_W / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? C_FIELD_GREEN : C_FIELD_DARK;
    ctx.fillRect(PLAY_LEFT + i * stripeW, FIELD_TOP, stripeW, FIELD_H);
  }

  // End zones
  ctx.fillStyle = C_EZ_HOME;
  ctx.fillRect(FIELD_LEFT, FIELD_TOP, EZ_W, FIELD_H);
  ctx.fillStyle = C_EZ_CPU;
  ctx.fillRect(FIELD_RIGHT - EZ_W, FIELD_TOP, EZ_W, FIELD_H);

  // End zone diagonal pattern
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let i = -FIELD_H; i < EZ_W + FIELD_H; i += 12) {
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT + i, FIELD_TOP);
    ctx.lineTo(FIELD_LEFT + i + FIELD_H, FIELD_BOTTOM);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(FIELD_RIGHT - EZ_W + i, FIELD_TOP);
    ctx.lineTo(FIELD_RIGHT - EZ_W + i + FIELD_H, FIELD_BOTTOM);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Hash marks every 5 yards
  ctx.strokeStyle = C_HASH;
  ctx.lineWidth = 1;
  const hashY1 = fieldY(0.33);
  const hashY2 = fieldY(0.67);
  for (let y = 0; y <= 100; y += 5) {
    const x = yardToX(y);
    ctx.beginPath(); ctx.moveTo(x, hashY1 - 6); ctx.lineTo(x, hashY1 + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hashY2 - 6); ctx.lineTo(x, hashY2 + 6); ctx.stroke();
  }

  // Yard lines every 10 yards
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y <= 100; y += 10) {
    const x = yardToX(y);
    ctx.beginPath(); ctx.moveTo(x, FIELD_TOP); ctx.lineTo(x, FIELD_BOTTOM); ctx.stroke();
    if (y > 0 && y < 100) {
      const label = y <= 50 ? String(y) : String(100 - y);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 10px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, FIELD_TOP + 14);
      ctx.fillText(label, x, FIELD_BOTTOM - 5);
    }
  }

  // End zone text
  ctx.save();
  ctx.font = 'bold 14px "Chakra Petch", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,200,255,0.9)';
  ctx.save();
  ctx.translate(FIELD_LEFT + EZ_W / 2, FIELD_TOP + FIELD_H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('HOME', 0, 0);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,180,180,0.9)';
  ctx.save();
  ctx.translate(FIELD_RIGHT - EZ_W / 2, FIELD_TOP + FIELD_H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('CPU', 0, 0);
  ctx.restore();
  ctx.restore();

  // Field border
  ctx.strokeStyle = C_LINE_WHITE;
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_W, FIELD_H);

  // First down line
  if (!cpuPossession && firstDownLine <= 100) {
    const fdX = yardToX(Math.min(firstDownLine, 100));
    ctx.strokeStyle = C_FIRST_DOWN;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(fdX, FIELD_TOP); ctx.lineTo(fdX, FIELD_BOTTOM); ctx.stroke();
  }

  // Line of scrimmage
  const losX = yardToX(ballYardLine);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(losX, FIELD_TOP); ctx.lineTo(losX, FIELD_BOTTOM); ctx.stroke();
  ctx.setLineDash([]);
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  playerScore: number,
  cpuScore: number,
  quarter: number,
  quarterTime: number,
  down: number,
  yardsToGo: number,
  ballYardLine: number,
  cpuPossession: boolean
) {
  ctx.fillStyle = C_HUD_BG;
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.fillStyle = C_HUD_BORDER;
  ctx.fillRect(0, HUD_H - 2, W, 2);

  const font = '"Chakra Petch", monospace';

  // HOME score box
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(8, 6, 110, 44);
  ctx.strokeStyle = '#42a5f5';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 6, 110, 44);
  ctx.fillStyle = '#90caf9';
  ctx.font = `bold 10px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('HOME', 63, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px ${font}`;
  ctx.fillText(String(playerScore), 63, 44);

  // CPU score box
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(W - 118, 6, 110, 44);
  ctx.strokeStyle = '#ef9a9a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W - 118, 6, 110, 44);
  ctx.fillStyle = '#ef9a9a';
  ctx.font = `bold 10px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('CPU', W - 63, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 26px ${font}`;
  ctx.fillText(String(cpuScore), W - 63, 44);

  // Center info
  const cx = W / 2;

  ctx.fillStyle = '#ffeb3b';
  ctx.font = `bold 11px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Q${quarter}`, cx - 80, 22);

  const mins = Math.floor(quarterTime / 60);
  const secs = Math.floor(quarterTime % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px ${font}`;
  ctx.fillText(timeStr, cx, 26);

  const downStr = `${ordinal(down)} & ${yardsToGo >= 99 ? 'Goal' : yardsToGo}`;
  ctx.fillStyle = '#b0bec5';
  ctx.font = `bold 11px ${font}`;
  ctx.fillText(downStr, cx, 44);

  const yl = Math.round(ballYardLine <= 50 ? ballYardLine : 100 - ballYardLine);
  const side = ballYardLine <= 50 ? 'OWN' : 'OPP';
  ctx.fillStyle = '#78909c';
  ctx.font = `10px ${font}`;
  ctx.fillText(`${side} ${yl}`, cx + 80, 22);

  ctx.fillStyle = cpuPossession ? C_AWAY_BODY : C_HOME_BODY;
  ctx.font = `bold 14px ${font}`;
  ctx.fillText(cpuPossession ? '◀ CPU' : 'HOME ▶', cx + 80, 40);
}

function drawRoutes(ctx: CanvasRenderingContext2D, players: Player[], phase: GamePhase) {
  if (phase !== 'PRE_SNAP' && phase !== 'AIMING') return;

  players.slice(1, 4).forEach((p, i) => {
    if (p.routePoints.length < 2) return;
    const colors = ['#ffeb3b', '#00e5ff', '#76ff03'];
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(p.routePoints[0].x, p.routePoints[0].y);
    for (let j = 1; j < p.routePoints.length; j++) {
      ctx.lineTo(p.routePoints[j].x, p.routePoints[j].y);
    }
    ctx.stroke();
    // Arrow at end
    const last = p.routePoints[p.routePoints.length - 1];
    const prev = p.routePoints[p.routePoints.length - 2];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(last.x + Math.cos(angle) * 6, last.y + Math.sin(angle) * 6);
    ctx.lineTo(last.x + Math.cos(angle + 2.4) * 5, last.y + Math.sin(angle + 2.4) * 5);
    ctx.lineTo(last.x + Math.cos(angle - 2.4) * 5, last.y + Math.sin(angle - 2.4) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  });
}

function drawAimLine(ctx: CanvasRenderingContext2D, qbPos: Vec2, aimAngle: number, aimPower: number) {
  const maxDist = 200 + aimPower * 1.5;
  const endX = qbPos.x + Math.cos(aimAngle) * maxDist;
  const endY = qbPos.y + Math.sin(aimAngle) * maxDist;

  ctx.strokeStyle = C_AIM_LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(qbPos.x, qbPos.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.fillStyle = C_AIM_DOT;
  ctx.beginPath();
  ctx.arc(endX, endY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const px = qbPos.x + Math.cos(aimAngle) * maxDist * t;
    const py = qbPos.y + Math.sin(aimAngle) * maxDist * t;
    ctx.fillStyle = `rgba(255,235,59,${0.3 + t * 0.5})`;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  const { pos, bodyColor, helmetColor, isTackled, hasBall, label, isSelected, tackleTimer } = p;
  const x = pos.x;
  const y = pos.y;

  ctx.save();
  ctx.translate(x, y);

  if (isTackled) {
    const angle = Math.PI / 2 * Math.min(1, (60 - tackleTimer) / 20);
    ctx.rotate(angle);
  }

  const s = 6;

  // Shadow
  ctx.fillStyle = C_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, s * 3.5, s * 2, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(-s * 1.2, s * 1.2, s * 0.9, s * 1.8);
  ctx.fillRect(s * 0.3, s * 1.2, s * 0.9, s * 1.8);

  // Cleats
  ctx.fillStyle = '#333';
  ctx.fillRect(-s * 1.2, s * 2.8, s * 0.9, s * 0.4);
  ctx.fillRect(s * 0.3, s * 2.8, s * 0.9, s * 0.4);

  // Jersey body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-s * 1.4, -s * 0.4, s * 2.8, s * 1.8);

  // Jersey number/label
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `bold ${Math.round(s * 1.1)}px "Chakra Petch", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, s * 0.5);

  // Shoulder pads highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-s * 1.4, -s * 0.4, s * 2.8, s * 0.5);

  // Helmet
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, -s * 1.5, s * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Helmet shine
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(-s * 0.3, -s * 1.9, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Facemask
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -s * 1.2, s * 0.8, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 1.2);
  ctx.lineTo(s * 0.6, -s * 1.2);
  ctx.stroke();

  // Selection glow
  if (isSelected) {
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, s * 2.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Ball carrier indicator
  if (hasBall && !p.isDefender) {
    ctx.fillStyle = C_BALL;
    ctx.beginPath();
    ctx.ellipse(s * 1.2, s * 0.3, 5, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, angle = 0.4, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C_BALL;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = C_BALL_LACE;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
  for (let i = -3; i <= 3; i += 2) {
    ctx.beginPath(); ctx.moveTo(i, -2.5); ctx.lineTo(i, 2.5); ctx.stroke();
  }

  ctx.restore();
}

function drawBallInFlight(ctx: CanvasRenderingContext2D, ball: Ball) {
  const t = ball.progress;
  const x = lerp(ball.startPos.x, ball.endPos.x, t);
  const arcY = Math.sin(t * Math.PI) * ball.arcHeight;
  const y = lerp(ball.startPos.y, ball.endPos.y, t) - arcY;
  const angle = ball.spin + t * Math.PI * 4;
  const scale = 0.8 + Math.sin(t * Math.PI) * 0.4;
  drawBall(ctx, x, y, angle, scale);
  ball.pos = { x, y };
}

function drawResultBanner(ctx: CanvasRenderingContext2D, text: string, color: string, timer: number) {
  if (timer <= 0 || !text) return;
  const alpha = Math.min(1, timer / 20);
  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = W / 2;
  const cy = FIELD_TOP + FIELD_H / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.roundRect(cx - 160, cy - 30, 320, 60, 8);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 160, cy - 30, 320, 60, 8);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 28px "Chakra Petch", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);

  ctx.restore();
}

function drawCatchFlash(ctx: CanvasRenderingContext2D, pos: Vec2 | null, timer: number) {
  if (!pos || timer <= 0) return;
  const alpha = timer / 30;
  const r = (30 - timer) * 3;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHalftimeScreen(ctx: CanvasRenderingContext2D, playerScore: number, cpuScore: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const font = '"Chakra Petch", monospace';

  ctx.fillStyle = '#ffeb3b';
  ctx.font = `bold 36px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HALFTIME', cx, cy - 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 20px ${font}`;
  ctx.fillText('SCORE', cx, cy - 20);

  ctx.fillStyle = '#90caf9';
  ctx.font = `bold 48px ${font}`;
  ctx.fillText(`${playerScore}`, cx - 60, cy + 30);
  ctx.fillStyle = '#78909c';
  ctx.font = `bold 32px ${font}`;
  ctx.fillText('-', cx, cy + 30);
  ctx.fillStyle = '#ef9a9a';
  ctx.font = `bold 48px ${font}`;
  ctx.fillText(`${cpuScore}`, cx + 60, cy + 30);

  ctx.fillStyle = '#b0bec5';
  ctx.font = `14px ${font}`;
  ctx.fillText('2nd Half Starting...', cx, cy + 80);
}

function drawGameOverScreen(ctx: CanvasRenderingContext2D, playerScore: number, cpuScore: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const font = '"Chakra Petch", monospace';
  const won = playerScore > cpuScore;
  const tied = playerScore === cpuScore;

  const titleColor = won ? '#00e676' : tied ? '#ffeb3b' : '#ff1744';
  const titleText = won ? 'VICTORY!' : tied ? 'TIE GAME' : 'DEFEAT';

  ctx.fillStyle = titleColor;
  ctx.font = `bold 48px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = titleColor;
  ctx.shadowBlur = 20;
  ctx.fillText(titleText, cx, cy - 70);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 18px ${font}`;
  ctx.fillText('FINAL SCORE', cx, cy - 20);

  ctx.fillStyle = '#90caf9';
  ctx.font = `bold 52px ${font}`;
  ctx.fillText(`${playerScore}`, cx - 70, cy + 35);
  ctx.fillStyle = '#78909c';
  ctx.font = `bold 36px ${font}`;
  ctx.fillText('-', cx, cy + 35);
  ctx.fillStyle = '#ef9a9a';
  ctx.font = `bold 52px ${font}`;
  ctx.fillText(`${cpuScore}`, cx + 70, cy + 35);

  ctx.fillStyle = '#b0bec5';
  ctx.font = `13px ${font}`;
  ctx.fillText('HOME vs CPU', cx, cy + 80);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RetroBowlGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initialState());
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mouseRef = useRef<Vec2>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const [uiPhase, setUiPhase] = useState<GamePhase>('PLAY_CALL');
  const [showPlayCall, setShowPlayCall] = useState(true);
  const [showHalftime, setShowHalftime] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showExtraPoint, setShowExtraPoint] = useState(false);
  const [instructions, setInstructions] = useState('');

  const syncUI = useCallback(() => {
    const s = stateRef.current;
    setUiPhase(s.phase);
    setShowPlayCall(s.phase === 'PLAY_CALL');
    setShowHalftime(s.phase === 'HALFTIME');
    setShowGameOver(s.phase === 'GAME_OVER');
    setShowExtraPoint(s.phase === 'EXTRA_POINT');
  }, []);

  // ─── Game Logic ─────────────────────────────────────────────────────────────

  const setupNewPlay = useCallback((gs: GameState) => {
    const players = makeOffensePlayers(gs.ballYardLine);
    const defenders = makeDefenders(gs.ballYardLine, players);
    gs.players = players;
    gs.defenders = defenders;
    gs.ball = makeInitialBall(gs.ballYardLine);
    gs.isAiming = false;
    gs.aimStartPos = null;
    gs.interceptionOccurred = false;
    gs.runCarrierIdx = 0;
    gs.scrambleTimer = 0;
    gs.playType = null;
    gs.phase = 'PLAY_CALL';
  }, []);

  const handleTouchdown = useCallback((gs: GameState, byCpu: boolean) => {
    if (byCpu) {
      gs.cpuScore += 6;
      gs.resultText = 'CPU TOUCHDOWN!';
      gs.resultColor = C_RESULT_BAD;
    } else {
      gs.playerScore += 6;
      gs.resultText = 'TOUCHDOWN!';
      gs.resultColor = C_RESULT_GOOD;
      gs.tdFlashTimer = 60;
    }
    gs.resultTimer = 90;
    gs.phase = 'EXTRA_POINT';
    gs.extraPointAttempt = true;
  }, []);

  const advanceDown = useCallback((gs: GameState, newYard: number) => {
    const gained = newYard - gs.ballYardLine;
    gs.ballYardLine = clamp(newYard, 0, 100);

    if (gs.ballYardLine >= 100) {
      handleTouchdown(gs, false);
      return;
    }
    if (gs.ballYardLine <= 0) {
      gs.cpuScore += 2;
      gs.resultText = 'SAFETY! +2 CPU';
      gs.resultColor = C_RESULT_BAD;
      gs.resultTimer = 80;
      gs.ballYardLine = 20;
      gs.down = 1;
      gs.yardsToGo = 10;
      gs.firstDownLine = 30;
      setTimeout(() => { setupNewPlay(gs); syncUI(); }, 2500);
      return;
    }

    if (gs.ballYardLine >= gs.firstDownLine) {
      gs.down = 1;
      gs.yardsToGo = 10;
      gs.firstDownLine = Math.min(100, gs.ballYardLine + 10);
      gs.resultText = 'FIRST DOWN!';
      gs.resultColor = C_RESULT_GOOD;
      gs.resultTimer = 60;
    } else {
      gs.down++;
      gs.yardsToGo = Math.max(1, gs.firstDownLine - gs.ballYardLine);
      if (gs.down > 4) {
        gs.resultText = 'TURNOVER ON DOWNS';
        gs.resultColor = C_RESULT_BAD;
        gs.resultTimer = 80;
        gs.cpuPossession = true;
        gs.cpuDriveYard = 100 - gs.ballYardLine;
        gs.ballYardLine = 100 - gs.ballYardLine;
        gs.down = 1;
        gs.yardsToGo = 10;
        gs.firstDownLine = gs.ballYardLine + 10;
        setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2500);
        return;
      }
      if (gained > 0) {
        gs.resultText = `+${Math.round(gained)} YDS`;
        gs.resultColor = C_RESULT_NEUTRAL;
      } else if (gained < 0) {
        gs.resultText = `LOSS OF ${Math.abs(Math.round(gained))}`;
        gs.resultColor = C_RESULT_BAD;
      } else {
        gs.resultText = 'NO GAIN';
        gs.resultColor = C_RESULT_NEUTRAL;
      }
      gs.resultTimer = 60;
    }

    setTimeout(() => { setupNewPlay(gs); syncUI(); }, 2000);
  }, [handleTouchdown, setupNewPlay, syncUI]);

  const handleInterception = useCallback((gs: GameState) => {
    gs.resultText = 'INTERCEPTED!';
    gs.resultColor = C_RESULT_BAD;
    gs.resultTimer = 90;
    gs.interceptionOccurred = true;
    gs.cpuPossession = true;
    gs.cpuDriveYard = 100 - gs.ballYardLine;
    gs.ballYardLine = 100 - gs.ballYardLine;
    gs.down = 1;
    gs.yardsToGo = 10;
    gs.firstDownLine = gs.ballYardLine + 10;
    setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2500);
  }, [syncUI]);

  const advanceQuarter = useCallback((gs: GameState) => {
    gs.quarter++;
    gs.quarterTime = 120;
    if (gs.quarter === 3) {
      gs.phase = 'HALFTIME';
      setTimeout(() => {
        gs.phase = 'PLAY_CALL';
        gs.cpuPossession = false;
        gs.ballYardLine = 20;
        gs.down = 1;
        gs.yardsToGo = 10;
        gs.firstDownLine = 30;
        setupNewPlay(gs);
        syncUI();
      }, 4000);
    } else if (gs.quarter > 4) {
      gs.phase = 'GAME_OVER';
    } else {
      setupNewPlay(gs);
    }
    syncUI();
  }, [setupNewPlay, syncUI]);

  // ─── CPU Possession Logic ────────────────────────────────────────────────────

  const tickCpuPlay = useCallback((gs: GameState, _dt: number) => {
    gs.cpuDriveTimer += 1;

    if (gs.cpuDriveTimer < 150) return;
    gs.cpuDriveTimer = 0;

    const isPass = Math.random() > 0.4;
    const gain = isPass
      ? randBetween(-3, 18)
      : randBetween(-2, 12);

    gs.cpuDriveYard += gain;
    gs.ballYardLine = clamp(100 - gs.cpuDriveYard, 0, 100);

    if (gs.cpuDriveYard >= 100) {
      handleTouchdown(gs, true);
      gs.cpuPossession = false;
      gs.ballYardLine = 20;
      gs.down = 1;
      gs.yardsToGo = 10;
      gs.firstDownLine = 30;
      setTimeout(() => { setupNewPlay(gs); syncUI(); }, 3000);
      return;
    }

    gs.down++;
    if (gs.down > 4) {
      gs.cpuDriveYard = 0;
      gs.cpuPossession = false;
      gs.ballYardLine = clamp(100 - gs.ballYardLine - 35, 5, 95);
      gs.down = 1;
      gs.yardsToGo = 10;
      gs.firstDownLine = gs.ballYardLine + 10;
      gs.resultText = 'CPU PUNTS';
      gs.resultColor = C_RESULT_NEUTRAL;
      gs.resultTimer = 60;
      setTimeout(() => { setupNewPlay(gs); syncUI(); }, 2000);
      return;
    }

    gs.quarterTime -= 15;
    if (gs.quarterTime <= 0) {
      advanceQuarter(gs);
    }
  }, [handleTouchdown, setupNewPlay, syncUI, advanceQuarter]);

  // ─── Game Loop ───────────────────────────────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    const gs = stateRef.current;

    // ── Update ──────────────────────────────────────────────────────────────

    if (gs.resultTimer > 0) gs.resultTimer -= 1;
    if (gs.catchFlashTimer > 0) gs.catchFlashTimer -= 1;
    if (gs.tdFlashTimer > 0) gs.tdFlashTimer -= 1;

    if (gs.phase === 'CPU_PLAY') {
      tickCpuPlay(gs, dt);
    }

    if (gs.phase === 'PRE_SNAP' || gs.phase === 'AIMING') {
      // Receivers run their routes
      gs.players.slice(1, 4).forEach((p) => {
        if (p.isTackled) return;
        const target = p.routePoints[Math.min(p.routeIndex + 1, p.routePoints.length - 1)];
        const d = dist(p.pos, target);
        if (d < 5 && p.routeIndex < p.routePoints.length - 2) {
          p.routeIndex++;
        }
        const dir = normalize({ x: target.x - p.pos.x, y: target.y - p.pos.y });
        p.pos.x += dir.x * p.speed;
        p.pos.y += dir.y * p.speed;
        p.facingRight = dir.x > 0;
      });

      // Defenders cover receivers
      gs.defenders.forEach((def) => {
        if (def.coveringReceiver >= 0) {
          const rec = gs.players[def.coveringReceiver];
          if (rec) {
            const dir = normalize({ x: rec.pos.x - def.pos.x, y: rec.pos.y - def.pos.y });
            def.pos.x += dir.x * def.speed * 0.9;
            def.pos.y += dir.y * def.speed * 0.9;
          }
        }
      });

      // Scramble timer
      if (gs.phase === 'AIMING') {
        gs.scrambleTimer++;
        if (gs.scrambleTimer > 300) {
          gs.phase = 'RUNNING';
          gs.runCarrierIdx = 0;
          gs.players[0].hasBall = true;
          gs.ball.carrier = 0;
        }
      }
    }

    if (gs.phase === 'BALL_FLIGHT') {
      gs.ball.progress += 0.025;
      gs.ball.spin += 0.15;

      if (gs.ball.progress >= 1) {
        gs.ball.progress = 1;
        gs.ball.inFlight = false;

        const landX = gs.ball.endPos.x;
        const landY = gs.ball.endPos.y;
        let caught = false;

        gs.players.slice(1, 4).forEach((rec) => {
          if (caught || rec.isTackled) return;
          const d = dist(rec.pos, { x: landX, y: landY });
          if (d < 35) {
            let intercepted = false;
            gs.defenders.forEach((def) => {
              if (intercepted) return;
              const dd = dist(def.pos, { x: landX, y: landY });
              if (dd < 28 && Math.random() < 0.3) {
                intercepted = true;
              }
            });

            if (intercepted) {
              handleInterception(gs);
            } else {
              caught = true;
              rec.hasBall = true;
              gs.ball.carrier = rec.id;
              gs.ball.pos = { ...rec.pos };
              gs.phase = 'RUNNING';
              gs.runCarrierIdx = rec.id;
              gs.catchFlashTimer = 30;
              gs.catchFlashPos = { ...rec.pos };
            }
          }
        });

        if (!caught && gs.phase === 'BALL_FLIGHT') {
          gs.resultText = 'INCOMPLETE';
          gs.resultColor = C_RESULT_NEUTRAL;
          gs.resultTimer = 60;
          gs.down++;
          gs.yardsToGo = Math.max(1, gs.firstDownLine - gs.ballYardLine);
          if (gs.down > 4) {
            gs.resultText = 'TURNOVER ON DOWNS';
            gs.resultColor = C_RESULT_BAD;
            gs.resultTimer = 80;
            gs.cpuPossession = true;
            gs.cpuDriveYard = 100 - gs.ballYardLine;
            gs.ballYardLine = 100 - gs.ballYardLine;
            gs.down = 1;
            gs.yardsToGo = 10;
            gs.firstDownLine = gs.ballYardLine + 10;
            setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2500);
          } else {
            setTimeout(() => { setupNewPlay(gs); syncUI(); }, 2000);
          }
          gs.phase = 'RESULT';
        }
      }
    }

    if (gs.phase === 'RUNNING') {
      const carrier = gs.players.find(p => p.id === gs.runCarrierIdx) || gs.players[0];

      if (!carrier.isTackled) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const dir = normalize({ x: mx - carrier.pos.x, y: my - carrier.pos.y });
        const speed = carrier.speed * 1.2;
        carrier.pos.x += dir.x * speed;
        carrier.pos.y += dir.y * speed;
        carrier.pos.x = clamp(carrier.pos.x, FIELD_LEFT + 2, FIELD_RIGHT - 2);
        carrier.pos.y = clamp(carrier.pos.y, FIELD_TOP + 2, FIELD_BOTTOM - 2);
        carrier.facingRight = dir.x > 0;
        gs.ball.pos = { ...carrier.pos };

        gs.defenders.forEach((def) => {
          if (def.isTackled) return;
          const d = dist(def.pos, carrier.pos);
          const chaseDir = normalize({ x: carrier.pos.x - def.pos.x, y: carrier.pos.y - def.pos.y });
          def.pos.x += chaseDir.x * def.speed;
          def.pos.y += chaseDir.y * def.speed;

          if (d < 18) {
            carrier.isTackled = true;
            carrier.tackleTimer = 60;
            const newYard = xToYard(carrier.pos.x);
            setTimeout(() => { advanceDown(gs, newYard); syncUI(); }, 1500);
          }
        });

        if (carrier.pos.x >= PLAY_RIGHT) {
          handleTouchdown(gs, false);
        }
        if (carrier.pos.x <= PLAY_LEFT) {
          gs.cpuScore += 2;
          gs.resultText = 'SAFETY! +2 CPU';
          gs.resultColor = C_RESULT_BAD;
          gs.resultTimer = 80;
          gs.ballYardLine = 20;
          gs.down = 1;
          gs.yardsToGo = 10;
          gs.firstDownLine = 30;
          setTimeout(() => { setupNewPlay(gs); syncUI(); }, 2500);
          gs.phase = 'RESULT';
        }
      } else {
        carrier.tackleTimer--;
      }
    }

    if (gs.phase === 'FIELD_GOAL_ANIM') {
      gs.fgAnimTimer++;
      gs.fgBallPos.y -= 4;
      gs.fgBallPos.x += 1;
      if (gs.fgAnimTimer > 60) {
        if (gs.fgSuccess) {
          gs.playerScore += 3;
          gs.resultText = 'FIELD GOAL! +3';
          gs.resultColor = C_RESULT_GOOD;
        } else {
          gs.resultText = 'NO GOOD!';
          gs.resultColor = C_RESULT_BAD;
        }
        gs.resultTimer = 80;
        gs.cpuPossession = true;
        gs.cpuDriveYard = 100 - gs.ballYardLine;
        gs.ballYardLine = 100 - gs.ballYardLine;
        gs.down = 1;
        gs.yardsToGo = 10;
        gs.firstDownLine = gs.ballYardLine + 10;
        setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2500);
        gs.phase = 'RESULT';
      }
    }

    // Quarter time tick
    if (gs.phase === 'PRE_SNAP' || gs.phase === 'AIMING' || gs.phase === 'RUNNING' || gs.phase === 'BALL_FLIGHT') {
      gs.quarterTime -= dt / 60;
      if (gs.quarterTime <= 0) {
        gs.quarterTime = 0;
        advanceQuarter(gs);
      }
    }

    // ── Draw ────────────────────────────────────────────────────────────────

    ctx.clearRect(0, 0, W, H);

    drawCrowd(ctx);
    drawField(ctx, gs.firstDownLine, gs.ballYardLine, gs.cpuPossession);
    drawRoutes(ctx, gs.players, gs.phase);

    if (gs.phase === 'AIMING' && gs.players[0]) {
      drawAimLine(ctx, gs.players[0].pos, gs.aimAngle, gs.aimPower);
    }

    gs.defenders.forEach(p => drawPlayer(ctx, p));
    gs.players.forEach(p => drawPlayer(ctx, p));

    if (gs.phase === 'BALL_FLIGHT') {
      drawBallInFlight(ctx, gs.ball);
    } else if (gs.ball.carrier < 0) {
      drawBall(ctx, gs.ball.pos.x, gs.ball.pos.y, gs.ball.spin);
    }

    if (gs.phase === 'FIELD_GOAL_ANIM') {
      drawBall(ctx, gs.fgBallPos.x, gs.fgBallPos.y, gs.fgAnimTimer * 0.2, 1.2);
    }

    drawCatchFlash(ctx, gs.catchFlashPos, gs.catchFlashTimer);
    drawResultBanner(ctx, gs.resultText, gs.resultColor, gs.resultTimer);

    if (gs.tdFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = (gs.tdFlashTimer / 60) * 0.3;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (gs.phase === 'HALFTIME') {
      drawHalftimeScreen(ctx, gs.playerScore, gs.cpuScore);
    }
    if (gs.phase === 'GAME_OVER') {
      drawGameOverScreen(ctx, gs.playerScore, gs.cpuScore);
    }

    drawHUD(ctx, gs.playerScore, gs.cpuScore, gs.quarter, gs.quarterTime,
      gs.down, gs.yardsToGo, gs.ballYardLine, gs.cpuPossession);

    animRef.current = requestAnimationFrame(gameLoop);
  }, [tickCpuPlay, advanceDown, handleTouchdown, handleInterception, advanceQuarter, setupNewPlay, syncUI]);

  // ─── Input Handlers ──────────────────────────────────────────────────────────

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e);
    mouseRef.current = pos;

    const gs = stateRef.current;
    if (gs.phase === 'AIMING' && isDraggingRef.current) {
      const qb = gs.players[0];
      if (!qb) return;
      const dx = pos.x - qb.pos.x;
      const dy = pos.y - qb.pos.y;
      gs.aimAngle = Math.atan2(dy, dx);
      gs.aimPower = Math.min(100, dist(pos, qb.pos));
    }
  }, [getCanvasPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e);
    mouseRef.current = pos;

    const gs = stateRef.current;

    if (gs.phase === 'PRE_SNAP' && gs.playType === 'PASS') {
      gs.phase = 'AIMING';
      isDraggingRef.current = true;
      const qb = gs.players[0];
      if (qb) {
        const dx = pos.x - qb.pos.x;
        const dy = pos.y - qb.pos.y;
        gs.aimAngle = Math.atan2(dy, dx);
        gs.aimPower = Math.min(100, dist(pos, qb.pos));
      }
    } else if (gs.phase === 'AIMING') {
      isDraggingRef.current = true;
      const qb = gs.players[0];
      if (qb) {
        const dx = pos.x - qb.pos.x;
        const dy = pos.y - qb.pos.y;
        gs.aimAngle = Math.atan2(dy, dx);
        gs.aimPower = Math.min(100, dist(pos, qb.pos));
      }
    }
  }, [getCanvasPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    getCanvasPos(e);
    const gs = stateRef.current;

    if (gs.phase === 'AIMING' && isDraggingRef.current) {
      isDraggingRef.current = false;
      const qb = gs.players[0];
      if (!qb) return;

      const throwDist = 180 + gs.aimPower * 1.2;
      const endX = qb.pos.x + Math.cos(gs.aimAngle) * throwDist;
      const endY = qb.pos.y + Math.sin(gs.aimAngle) * throwDist;

      gs.ball.inFlight = true;
      gs.ball.startPos = { ...qb.pos };
      gs.ball.endPos = {
        x: clamp(endX, FIELD_LEFT + 5, FIELD_RIGHT - 5),
        y: clamp(endY, FIELD_TOP + 5, FIELD_BOTTOM - 5),
      };
      gs.ball.progress = 0;
      gs.ball.arcHeight = 60 + gs.aimPower * 0.4;
      gs.ball.carrier = -1;
      gs.ball.spin = 0;
      qb.hasBall = false;
      gs.phase = 'BALL_FLIGHT';
    }
  }, [getCanvasPos]);

  // ─── Play Call Handlers ──────────────────────────────────────────────────────

  const handlePlayCall = useCallback((option: 'PASS' | 'RUN' | 'FIELD_GOAL' | 'PUNT') => {
    const gs = stateRef.current;

    if (option === 'FIELD_GOAL') {
      const fgDist = 100 - gs.ballYardLine;
      gs.fgSuccess = fgDist <= 45 ? Math.random() > 0.2 : Math.random() > 0.55;
      gs.fgBallPos = { x: yardToX(gs.ballYardLine), y: fieldCenterY() };
      gs.fgAnimTimer = 0;
      gs.phase = 'FIELD_GOAL_ANIM';
      syncUI();
      return;
    }

    if (option === 'PUNT') {
      const puntYards = randBetween(35, 50);
      const newYard = clamp(gs.ballYardLine + puntYards, 5, 95);
      gs.resultText = `PUNT - ${Math.round(puntYards)} YDS`;
      gs.resultColor = C_RESULT_NEUTRAL;
      gs.resultTimer = 60;
      gs.cpuPossession = true;
      gs.cpuDriveYard = 100 - newYard;
      gs.ballYardLine = newYard;
      gs.down = 1;
      gs.yardsToGo = 10;
      gs.firstDownLine = newYard + 10;
      setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2000);
      gs.phase = 'RESULT';
      syncUI();
      return;
    }

    gs.playType = option;
    gs.phase = 'PRE_SNAP';

    if (option === 'RUN') {
      gs.phase = 'RUNNING';
      gs.runCarrierIdx = 0;
      gs.players[0].hasBall = true;
      gs.ball.carrier = 0;
      setInstructions('Move mouse/finger to steer the ball carrier!');
    } else {
      setInstructions('Drag from QB to aim and release to throw!');
    }

    syncUI();
  }, [syncUI]);

  const handleExtraPoint = useCallback((attempt: boolean) => {
    const gs = stateRef.current;
    if (attempt) {
      const success = Math.random() > 0.1;
      if (success) {
        gs.playerScore += 1;
        gs.resultText = 'EXTRA POINT!';
        gs.resultColor = C_RESULT_GOOD;
      } else {
        gs.resultText = 'NO GOOD!';
        gs.resultColor = C_RESULT_BAD;
      }
    } else {
      gs.resultText = 'SKIPPED';
      gs.resultColor = C_RESULT_NEUTRAL;
    }
    gs.resultTimer = 60;
    gs.extraPointAttempt = false;

    gs.cpuPossession = true;
    gs.cpuDriveYard = 20;
    gs.ballYardLine = 80;
    gs.down = 1;
    gs.yardsToGo = 10;
    gs.firstDownLine = 90;

    gs.quarterTime -= 20;
    if (gs.quarterTime <= 0) {
      advanceQuarter(gs);
    } else {
      setTimeout(() => { gs.phase = 'CPU_PLAY'; gs.cpuDriveTimer = 0; syncUI(); }, 2000);
      gs.phase = 'RESULT';
    }
    syncUI();
  }, [advanceQuarter, syncUI]);

  const handlePlayAgain = useCallback(() => {
    stateRef.current = initialState();
    syncUI();
  }, [syncUI]);

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  useEffect(() => {
    syncUI();
  }, [syncUI]);

  // suppress unused warning for uiPhase — it drives syncUI indirectly
  void uiPhase;

  return (
    <div className="flex flex-col items-center w-full bg-[#0a0a14] min-h-screen select-none">
      <div className="relative w-full max-w-3xl">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full block cursor-crosshair"
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchMove={(e) => { e.preventDefault(); handleMouseMove(e); }}
          onTouchStart={(e) => { e.preventDefault(); handleMouseDown(e); }}
          onTouchEnd={(e) => { e.preventDefault(); handleMouseUp(e); }}
        />

        {/* Play Call Overlay */}
        {showPlayCall && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-xl border-2 p-5 w-80 shadow-2xl"
              style={{
                background: 'rgba(10,10,20,0.95)',
                borderColor: '#ff6b00',
                fontFamily: '"Chakra Petch", monospace',
              }}
            >
              <div className="text-center mb-4">
                <div className="text-xs text-gray-400 mb-1">
                  {ordinal(stateRef.current.down)} & {stateRef.current.yardsToGo} •{' '}
                  {stateRef.current.ballYardLine <= 50
                    ? `Own ${Math.round(stateRef.current.ballYardLine)}`
                    : `Opp ${Math.round(100 - stateRef.current.ballYardLine)}`}
                </div>
                <div className="text-white font-bold text-lg tracking-wider">CALL A PLAY</div>
              </div>

              <div className="mb-3">
                <div className="text-xs text-orange-400 mb-2 tracking-widest">PASSING</div>
                <button
                  onClick={() => handlePlayCall('PASS')}
                  className="w-full py-3 rounded-lg font-bold text-white text-sm mb-2 transition-all active:scale-95"
                  style={{ background: '#1565c0', border: '1px solid #42a5f5' }}
                >
                  🏈 PASS PLAY
                  <div className="text-xs font-normal text-blue-300 mt-0.5">Drag to aim, release to throw</div>
                </button>
              </div>

              <div className="mb-3">
                <div className="text-xs text-orange-400 mb-2 tracking-widest">RUSHING</div>
                <button
                  onClick={() => handlePlayCall('RUN')}
                  className="w-full py-3 rounded-lg font-bold text-white text-sm mb-2 transition-all active:scale-95"
                  style={{ background: '#2e7d32', border: '1px solid #66bb6a' }}
                >
                  🏃 RUN PLAY
                  <div className="text-xs font-normal text-green-300 mt-0.5">Move mouse/finger to steer</div>
                </button>
              </div>

              <div>
                <div className="text-xs text-orange-400 mb-2 tracking-widest">SPECIAL TEAMS</div>
                <div className="flex gap-2">
                  {stateRef.current.down === 4 && (
                    <>
                      <button
                        onClick={() => handlePlayCall('FIELD_GOAL')}
                        className="flex-1 py-2 rounded-lg font-bold text-white text-xs transition-all active:scale-95"
                        style={{ background: '#f57f17', border: '1px solid #ffca28' }}
                      >
                        🥅 FIELD GOAL
                        <div className="text-xs font-normal text-yellow-200 mt-0.5">
                          {100 - stateRef.current.ballYardLine <= 45 ? 'Good range' : 'Long shot'}
                        </div>
                      </button>
                      <button
                        onClick={() => handlePlayCall('PUNT')}
                        className="flex-1 py-2 rounded-lg font-bold text-white text-xs transition-all active:scale-95"
                        style={{ background: '#4a148c', border: '1px solid #ab47bc' }}
                      >
                        👟 PUNT
                        <div className="text-xs font-normal text-purple-200 mt-0.5">~40 yards</div>
                      </button>
                    </>
                  )}
                  {stateRef.current.down !== 4 && (
                    <div className="text-xs text-gray-600 text-center w-full py-2">
                      Field Goal / Punt available on 4th down
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extra Point Overlay */}
        {showExtraPoint && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="rounded-xl border-2 p-6 w-72 shadow-2xl text-center"
              style={{
                background: 'rgba(10,10,20,0.95)',
                borderColor: '#ffeb3b',
                fontFamily: '"Chakra Petch", monospace',
              }}
            >
              <div className="text-4xl mb-2">🏈</div>
              <div className="text-yellow-400 font-bold text-xl mb-1">TOUCHDOWN!</div>
              <div className="text-white font-bold text-lg mb-4">EXTRA POINT?</div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleExtraPoint(true)}
                  className="flex-1 py-3 rounded-lg font-bold text-white transition-all active:scale-95"
                  style={{ background: '#1565c0', border: '1px solid #42a5f5' }}
                >
                  KICK (+1)
                </button>
                <button
                  onClick={() => handleExtraPoint(false)}
                  className="flex-1 py-3 rounded-lg font-bold text-gray-400 transition-all active:scale-95"
                  style={{ background: '#1a1a2e', border: '1px solid #333' }}
                >
                  SKIP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {showGameOver && (
          <div className="absolute inset-0 flex items-end justify-center pb-16">
            <button
              onClick={handlePlayAgain}
              className="px-10 py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-95 shadow-lg"
              style={{
                background: '#ff6b00',
                border: '2px solid #ffab40',
                fontFamily: '"Chakra Petch", monospace',
                boxShadow: '0 0 20px rgba(255,107,0,0.5)',
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Instructions bar */}
        {instructions && !showPlayCall && !showExtraPoint && !showGameOver && !showHalftime && (
          <div
            className="absolute bottom-0 left-0 right-0 text-center py-2 text-xs"
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#b0bec5',
              fontFamily: '"Chakra Petch", monospace',
            }}
          >
            {instructions}
          </div>
        )}
      </div>

      {/* Controls Guide */}
      <div
        className="w-full max-w-3xl mt-3 px-4 pb-4 grid grid-cols-2 gap-3 text-xs"
        style={{ fontFamily: '"Chakra Petch", monospace', color: '#78909c' }}
      >
        <div className="rounded-lg p-3" style={{ background: '#0d1117', border: '1px solid #1e2a3a' }}>
          <div className="text-blue-400 font-bold mb-1">🏈 PASSING</div>
          <div>Select PASS PLAY, then drag from the QB to aim your throw. Release to throw the ball!</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: '#0d1117', border: '1px solid #1e2a3a' }}>
          <div className="text-green-400 font-bold mb-1">🏃 RUNNING</div>
          <div>Select RUN PLAY, then move your mouse/finger to steer the ball carrier through defenders!</div>
        </div>
      </div>
    </div>
  );
}
