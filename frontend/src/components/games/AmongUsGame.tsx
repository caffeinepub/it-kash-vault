import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Role = 'crewmate' | 'impostor';
type GamePhase = 'idle' | 'playing' | 'voting' | 'ended';
type WinReason = 'tasks' | 'impostor_ejected' | 'crewmates_eliminated' | null;

interface Vec2 { x: number; y: number; }

interface Room {
  id: string;
  name: string;
  x: number; y: number; w: number; h: number;
  taskCount: number;
}

interface Task {
  id: string;
  roomId: string;
  x: number; y: number;
  completed: boolean;
  progress: number; // 0-1
  isActive: boolean;
}

interface Player {
  id: string;
  name: string;
  color: string;
  x: number; y: number;
  role: Role;
  isAlive: boolean;
  isAI: boolean;
  // AI state
  aiTarget: Vec2 | null;
  aiState: 'roam' | 'task' | 'kill' | 'flee';
  aiTimer: number;
  aiTaskTarget: string | null;
}

interface Body {
  x: number; y: number;
  color: string;
  reportedBy: Set<string>;
}

interface VoteState {
  votes: Record<string, string | 'skip'>; // voterId -> targetId | 'skip'
}

// ── Map Layout ─────────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 520;

const ROOMS: Room[] = [
  { id: 'cafeteria',   name: 'CAFETERIA',   x: 300, y: 20,  w: 200, h: 120, taskCount: 2 },
  { id: 'weapons',     name: 'WEAPONS',     x: 560, y: 20,  w: 160, h: 100, taskCount: 1 },
  { id: 'navigation',  name: 'NAVIGATION',  x: 600, y: 160, w: 160, h: 100, taskCount: 2 },
  { id: 'shields',     name: 'SHIELDS',     x: 580, y: 310, w: 160, h: 100, taskCount: 1 },
  { id: 'storage',     name: 'STORAGE',     x: 300, y: 390, w: 200, h: 110, taskCount: 1 },
  { id: 'admin',       name: 'ADMIN',       x: 80,  y: 310, w: 160, h: 100, taskCount: 1 },
  { id: 'electrical',  name: 'ELECTRICAL',  x: 60,  y: 160, w: 160, h: 100, taskCount: 2 },
  { id: 'medbay',      name: 'MEDBAY',      x: 80,  y: 20,  w: 160, h: 120, taskCount: 1 },
];

// Corridors as rectangles connecting rooms
const CORRIDORS: { x: number; y: number; w: number; h: number }[] = [
  // Top horizontal (medbay <-> cafeteria)
  { x: 240, y: 50, w: 60, h: 40 },
  // Top horizontal (cafeteria <-> weapons)
  { x: 500, y: 50, w: 60, h: 40 },
  // Right vertical (weapons <-> navigation)
  { x: 630, y: 120, w: 60, h: 40 },
  // Right vertical (navigation <-> shields)
  { x: 630, y: 260, w: 60, h: 50 },
  // Bottom horizontal (shields <-> storage)
  { x: 500, y: 400, w: 80, h: 40 },
  // Bottom horizontal (storage <-> admin)
  { x: 240, y: 400, w: 60, h: 40 },
  // Left vertical (admin <-> electrical)
  { x: 110, y: 260, w: 60, h: 50 },
  // Left vertical (electrical <-> medbay)
  { x: 110, y: 120, w: 60, h: 40 },
  // Center vertical (cafeteria <-> storage)
  { x: 370, y: 140, w: 60, h: 250 },
];

// ── Constants ──────────────────────────────────────────────────────────────────
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 2.8;
const AI_SPEED = 1.6;
const KILL_RANGE = 50;
const TASK_RANGE = 40;
const REPORT_RANGE = 60;
const TASK_FILL_RATE = 0.012;
const TOTAL_TASKS_NEEDED = 8;

const PLAYER_COLORS = ['#ff4444', '#4488ff', '#44ff88', '#ffaa00', '#ff44ff', '#00ffff', '#ff8844', '#88ff44'];
const AI_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isInRoom(x: number, y: number, room: Room): boolean {
  return x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h;
}

function isInCorridor(x: number, y: number): boolean {
  return CORRIDORS.some(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
}

function isWalkable(x: number, y: number): boolean {
  return ROOMS.some(r => isInRoom(x, y, r)) || isInCorridor(x, y);
}

function clampToMap(x: number, y: number, prevX: number, prevY: number): Vec2 {
  if (isWalkable(x, y)) return { x, y };
  if (isWalkable(x, prevY)) return { x, y: prevY };
  if (isWalkable(prevX, y)) return { x: prevX, y };
  return { x: prevX, y: prevY };
}

function roomCenter(room: Room): Vec2 {
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

function randomRoomPoint(room: Room): Vec2 {
  return {
    x: room.x + 20 + Math.random() * (room.w - 40),
    y: room.y + 20 + Math.random() * (room.h - 40),
  };
}

function initTasks(): Task[] {
  const tasks: Task[] = [];
  let id = 0;
  for (const room of ROOMS) {
    for (let i = 0; i < room.taskCount; i++) {
      const cx = roomCenter(room);
      const offset = room.taskCount > 1 ? (i === 0 ? -25 : 25) : 0;
      tasks.push({
        id: `task_${id++}`,
        roomId: room.id,
        x: cx.x + offset,
        y: cx.y + (i % 2 === 0 ? -15 : 15),
        completed: false,
        progress: 0,
        isActive: false,
      });
    }
  }
  return tasks;
}

function initPlayers(): Player[] {
  const players: Player[] = [];
  const start = roomCenter(ROOMS[0]); // cafeteria

  // Human player
  players.push({
    id: 'player',
    name: 'YOU',
    color: PLAYER_COLORS[0],
    x: start.x,
    y: start.y,
    role: 'crewmate',
    isAlive: true,
    isAI: false,
    aiTarget: null,
    aiState: 'roam',
    aiTimer: 0,
    aiTaskTarget: null,
  });

  // AI players
  for (let i = 0; i < 5; i++) {
    players.push({
      id: `ai_${i}`,
      name: AI_NAMES[i],
      color: PLAYER_COLORS[i + 1],
      x: start.x + (Math.random() - 0.5) * 60,
      y: start.y + (Math.random() - 0.5) * 60,
      role: 'crewmate',
      isAlive: true,
      isAI: true,
      aiTarget: null,
      aiState: 'roam',
      aiTimer: 0,
      aiTaskTarget: null,
    });
  }

  return players;
}

function assignRoles(players: Player[]): Player[] {
  const updated = players.map(p => ({ ...p, role: 'crewmate' as Role }));
  // Randomly assign 1 impostor among AI players
  const aiPlayers = updated.filter(p => p.isAI);
  const impostorIdx = Math.floor(Math.random() * aiPlayers.length);
  aiPlayers[impostorIdx].role = 'impostor';
  // 30% chance player is impostor
  if (Math.random() < 0.3) {
    updated[0].role = 'impostor';
    aiPlayers[impostorIdx].role = 'crewmate';
  }
  return updated;
}

// ── Drawing helpers ────────────────────────────────────────────────────────────
function drawMap(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw corridors
  for (const c of CORRIDORS) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }

  // Draw rooms
  for (const room of ROOMS) {
    // Room fill
    const grad = ctx.createLinearGradient(room.x, room.y, room.x, room.y + room.h);
    grad.addColorStop(0, '#1e1e3a');
    grad.addColorStop(1, '#141428');
    ctx.fillStyle = grad;
    ctx.fillRect(room.x, room.y, room.w, room.h);

    // Room border with neon glow
    ctx.strokeStyle = '#3a3a6a';
    ctx.lineWidth = 2;
    ctx.strokeRect(room.x, room.y, room.w, room.h);

    // Neon accent line on top
    ctx.strokeStyle = '#4444aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(room.x + 4, room.y + 2);
    ctx.lineTo(room.x + room.w - 4, room.y + 2);
    ctx.stroke();

    // Room name
    ctx.save();
    ctx.font = 'bold 9px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6666aa';
    ctx.fillText(room.name, room.x + room.w / 2, room.y + 14);
    ctx.restore();
  }
}

function drawTask(ctx: CanvasRenderingContext2D, task: Task) {
  if (task.completed) {
    // Completed task - green checkmark
    ctx.save();
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.arc(task.x, task.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Task icon
  const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.shadowColor = task.isActive ? '#ffaa00' : '#4488ff';
  ctx.shadowBlur = task.isActive ? 16 : 8;
  ctx.strokeStyle = task.isActive ? '#ffaa00' : '#4488ff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.arc(task.x, task.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Progress arc
  if (task.isActive && task.progress > 0) {
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(task.x, task.y, 10, -Math.PI / 2, -Math.PI / 2 + task.progress * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isHuman: boolean, showRole: boolean) {
  if (!player.isAlive) return;

  ctx.save();
  // Glow
  ctx.shadowColor = player.color;
  ctx.shadowBlur = isHuman ? 20 : 10;

  // Body (bean shape)
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 2, PLAYER_RADIUS - 2, PLAYER_RADIUS, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = 'rgba(150, 220, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(player.x + 3, player.y - 4, 7, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Backpack
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x - PLAYER_RADIUS + 1, player.y - 2, 6, 10);

  // Outline
  ctx.strokeStyle = isHuman ? '#ffffff' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = isHuman ? 2 : 1;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 2, PLAYER_RADIUS - 2, PLAYER_RADIUS, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Name tag
  ctx.font = `bold ${isHuman ? 10 : 9}px Orbitron, monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = isHuman ? '#ffffff' : 'rgba(255,255,255,0.7)';
  ctx.fillText(player.name, player.x, player.y - PLAYER_RADIUS - 4);

  // Role indicator (only for human player's own role)
  if (showRole && isHuman) {
    ctx.font = '8px Orbitron, monospace';
    ctx.fillStyle = player.role === 'impostor' ? '#ff4444' : '#39ff14';
    ctx.fillText(player.role === 'impostor' ? '👿' : '✓', player.x, player.y - PLAYER_RADIUS - 14);
  }

  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, body: Body) {
  ctx.save();
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = body.color;
  ctx.globalAlpha = 0.7;
  // Lying down X shape
  ctx.beginPath();
  ctx.ellipse(body.x, body.y, PLAYER_RADIUS, PLAYER_RADIUS / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(body.x - 6, body.y - 6);
  ctx.lineTo(body.x + 6, body.y + 6);
  ctx.moveTo(body.x + 6, body.y - 6);
  ctx.lineTo(body.x - 6, body.y + 6);
  ctx.stroke();
  ctx.restore();
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AmongUsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Game state refs (for animation loop)
  const playersRef = useRef<Player[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const bodiesRef = useRef<Body[]>([]);
  const phaseRef = useRef<GamePhase>('idle');
  const keysRef = useRef<Set<string>>(new Set());
  const completedTasksRef = useRef(0);
  const voteStateRef = useRef<VoteState>({ votes: {} });
  const sabotageTimerRef = useRef(0);
  const meetingCooldownRef = useRef(0);
  const activeTaskRef = useRef<string | null>(null);
  const mouseRef = useRef<Vec2>({ x: 0, y: 0 });
  const isFillingTaskRef = useRef(false);

  // React state for UI
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [playerRole, setPlayerRole] = useState<Role>('crewmate');
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks] = useState(TOTAL_TASKS_NEEDED);
  const [alivePlayers, setAlivePlayers] = useState<Player[]>([]);
  const [bodies, setBodies] = useState<Body[]>([]);
  const [nearKillTarget, setNearKillTarget] = useState<string | null>(null);
  const [nearTask, setNearTask] = useState<string | null>(null);
  const [nearBody, setNearBody] = useState<boolean>(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [winReason, setWinReason] = useState<WinReason>(null);
  const [winner, setWinner] = useState<'crewmates' | 'impostor' | null>(null);
  const [voteTarget, setVoteTarget] = useState<string | 'skip' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [sabotageActive, setSabotageActive] = useState(false);
  const [meetingCooldown, setMeetingCooldown] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  // ── Game initialization ──────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const players = assignRoles(initPlayers());
    const tasks = initTasks();
    playersRef.current = players;
    tasksRef.current = tasks;
    bodiesRef.current = [];
    completedTasksRef.current = 0;
    voteStateRef.current = { votes: {} };
    sabotageTimerRef.current = 0;
    meetingCooldownRef.current = 120;
    activeTaskRef.current = null;
    isFillingTaskRef.current = false;

    const human = players.find(p => !p.isAI)!;
    setPlayerRole(human.role);
    setCompletedTasks(0);
    setAlivePlayers(players.filter(p => p.isAlive));
    setBodies([]);
    setNearKillTarget(null);
    setNearTask(null);
    setNearBody(false);
    setActiveTask(null);
    setWinReason(null);
    setWinner(null);
    setVoteTarget(null);
    setHasVoted(false);
    setSabotageActive(false);
    setMeetingCooldown(120);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  // ── Win condition check ──────────────────────────────────────────────────────
  const checkWinConditions = useCallback(() => {
    const players = playersRef.current;
    const aliveCrewmates = players.filter(p => p.isAlive && p.role === 'crewmate');
    const aliveImpostors = players.filter(p => p.isAlive && p.role === 'impostor');

    // Impostor wins if crewmates <= impostors
    if (aliveCrewmates.length <= aliveImpostors.length) {
      phaseRef.current = 'ended';
      setPhase('ended');
      setWinner('impostor');
      setWinReason('crewmates_eliminated');
      return true;
    }

    // Crewmates win if all tasks done
    if (completedTasksRef.current >= TOTAL_TASKS_NEEDED) {
      phaseRef.current = 'ended';
      setPhase('ended');
      setWinner('crewmates');
      setWinReason('tasks');
      return true;
    }

    return false;
  }, []);

  // ── Voting logic ─────────────────────────────────────────────────────────────
  const triggerMeeting = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    if (meetingCooldownRef.current > 0) return;
    phaseRef.current = 'voting';
    voteStateRef.current = { votes: {} };
    setPhase('voting');
    setHasVoted(false);
    setVoteTarget(null);
    setAlivePlayers([...playersRef.current.filter(p => p.isAlive)]);
    activeTaskRef.current = null;
    setActiveTask(null);
    isFillingTaskRef.current = false;
  }, []);

  const submitVote = useCallback(() => {
    if (!voteTarget || hasVoted) return;
    setHasVoted(true);
    voteStateRef.current.votes['player'] = voteTarget;

    // AI votes: impostors vote for a crewmate, crewmates vote randomly
    const alivePlayers = playersRef.current.filter(p => p.isAlive && p.isAI);
    for (const ai of alivePlayers) {
      if (ai.role === 'impostor') {
        // Vote for a random crewmate
        const crewmates = playersRef.current.filter(p => p.isAlive && p.role === 'crewmate' && p.id !== ai.id);
        if (crewmates.length > 0) {
          voteStateRef.current.votes[ai.id] = crewmates[Math.floor(Math.random() * crewmates.length)].id;
        } else {
          voteStateRef.current.votes[ai.id] = 'skip';
        }
      } else {
        // Random vote
        const targets = playersRef.current.filter(p => p.isAlive && p.id !== ai.id);
        if (targets.length > 0 && Math.random() > 0.3) {
          voteStateRef.current.votes[ai.id] = targets[Math.floor(Math.random() * targets.length)].id;
        } else {
          voteStateRef.current.votes[ai.id] = 'skip';
        }
      }
    }

    // Tally votes
    const voteCounts: Record<string, number> = {};
    for (const v of Object.values(voteStateRef.current.votes)) {
      if (v !== 'skip') {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
      }
    }

    // Find most voted
    let maxVotes = 0;
    let ejected: string | null = null;
    let tie = false;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) { maxVotes = count; ejected = id; tie = false; }
      else if (count === maxVotes) { tie = true; }
    }

    setTimeout(() => {
      if (ejected && !tie) {
        const target = playersRef.current.find(p => p.id === ejected);
        if (target) {
          target.isAlive = false;
          if (target.role === 'impostor') {
            phaseRef.current = 'ended';
            setPhase('ended');
            setWinner('crewmates');
            setWinReason('impostor_ejected');
            return;
          }
        }
      }

      meetingCooldownRef.current = 180;
      setMeetingCooldown(180);
      phaseRef.current = 'playing';
      setPhase('playing');
      setAlivePlayers([...playersRef.current.filter(p => p.isAlive)]);
      checkWinConditions();
    }, 1500);
  }, [voteTarget, hasVoted, checkWinConditions]);

  // ── AI update ────────────────────────────────────────────────────────────────
  const updateAI = useCallback(() => {
    const players = playersRef.current;
    const tasks = tasksRef.current;
    const human = players.find(p => !p.isAI);
    if (!human) return;

    for (const ai of players) {
      if (!ai.isAI || !ai.isAlive) continue;

      ai.aiTimer--;

      if (ai.role === 'impostor') {
        // Impostor AI: hunt crewmates
        const aliveCrewmates = players.filter(p => p.isAlive && p.role === 'crewmate');
        if (aliveCrewmates.length === 0) continue;

        if (ai.aiTimer <= 0 || !ai.aiTarget) {
          // Pick a target to move toward
          const target = aliveCrewmates[Math.floor(Math.random() * aliveCrewmates.length)];
          ai.aiTarget = { x: target.x, y: target.y };
          ai.aiTimer = 60 + Math.floor(Math.random() * 60);
        }

        // Try to kill nearby crewmate
        for (const crewmate of aliveCrewmates) {
          if (dist(ai, crewmate) < KILL_RANGE * 0.8 && Math.random() < 0.02) {
            crewmate.isAlive = false;
            bodiesRef.current.push({ x: crewmate.x, y: crewmate.y, color: crewmate.color, reportedBy: new Set() });
            setBodies([...bodiesRef.current]);
            setAlivePlayers([...players.filter(p => p.isAlive)]);
            checkWinConditions();
          }
        }
      } else {
        // Crewmate AI: do tasks
        if (ai.aiTimer <= 0 || !ai.aiTarget) {
          const incompleteTasks = tasks.filter(t => !t.completed);
          if (incompleteTasks.length > 0) {
            const t = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
            ai.aiTarget = { x: t.x, y: t.y };
            ai.aiTaskTarget = t.id;
            ai.aiState = 'task';
            ai.aiTimer = 120 + Math.floor(Math.random() * 120);
          } else {
            // Roam
            const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
            ai.aiTarget = randomRoomPoint(room);
            ai.aiState = 'roam';
            ai.aiTimer = 80 + Math.floor(Math.random() * 80);
          }
        }

        // Complete task if near
        if (ai.aiTaskTarget) {
          const task = tasks.find(t => t.id === ai.aiTaskTarget);
          if (task && !task.completed && dist(ai, task) < TASK_RANGE) {
            task.progress = Math.min(1, task.progress + TASK_FILL_RATE * 0.5);
            if (task.progress >= 1) {
              task.completed = true;
              completedTasksRef.current = Math.min(TOTAL_TASKS_NEEDED, completedTasksRef.current + 1);
              setCompletedTasks(completedTasksRef.current);
              ai.aiTaskTarget = null;
              checkWinConditions();
            }
          }
        }
      }

      // Move toward target
      if (ai.aiTarget) {
        const dx = ai.aiTarget.x - ai.x;
        const dy = ai.aiTarget.y - ai.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 4) {
          const nx = ai.x + (dx / d) * AI_SPEED;
          const ny = ai.y + (dy / d) * AI_SPEED;
          const clamped = clampToMap(nx, ny, ai.x, ai.y);
          ai.x = clamped.x;
          ai.y = clamped.y;
        } else {
          ai.aiTarget = null;
        }
      }
    }
  }, [checkWinConditions]);

  // ── Game loop ────────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (phaseRef.current !== 'playing') {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const players = playersRef.current;
    const tasks = tasksRef.current;
    const human = players.find(p => !p.isAI);
    if (!human || !human.isAlive) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // ── Player movement ──────────────────────────────────────────────────────
    const keys = keysRef.current;
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = human.x + (dx / len) * PLAYER_SPEED;
      const ny = human.y + (dy / len) * PLAYER_SPEED;
      const clamped = clampToMap(nx, ny, human.x, human.y);
      human.x = clamped.x;
      human.y = clamped.y;
    }

    // ── Task interaction ─────────────────────────────────────────────────────
    let foundNearTask: string | null = null;
    for (const task of tasks) {
      if (!task.completed && dist(human, task) < TASK_RANGE) {
        foundNearTask = task.id;
        if (activeTaskRef.current === task.id && isFillingTaskRef.current) {
          task.progress = Math.min(1, task.progress + TASK_FILL_RATE);
          if (task.progress >= 1) {
            task.completed = true;
            task.isActive = false;
            activeTaskRef.current = null;
            isFillingTaskRef.current = false;
            setActiveTask(null);
            completedTasksRef.current = Math.min(TOTAL_TASKS_NEEDED, completedTasksRef.current + 1);
            setCompletedTasks(completedTasksRef.current);
            checkWinConditions();
          }
        }
        break;
      }
    }
    setNearTask(foundNearTask);

    // ── Kill proximity (impostor) ────────────────────────────────────────────
    let foundKillTarget: string | null = null;
    if (human.role === 'impostor') {
      for (const p of players) {
        if (p.isAlive && p.id !== 'player' && p.role === 'crewmate' && dist(human, p) < KILL_RANGE) {
          foundKillTarget = p.id;
          break;
        }
      }
    }
    setNearKillTarget(foundKillTarget);

    // ── Body proximity ───────────────────────────────────────────────────────
    let foundNearBody = false;
    for (const body of bodiesRef.current) {
      if (dist(human, body) < REPORT_RANGE && !body.reportedBy.has('player')) {
        foundNearBody = true;
        break;
      }
    }
    setNearBody(foundNearBody);

    // ── Meeting cooldown ─────────────────────────────────────────────────────
    if (meetingCooldownRef.current > 0) {
      meetingCooldownRef.current--;
      if (meetingCooldownRef.current % 60 === 0) {
        setMeetingCooldown(meetingCooldownRef.current);
      }
    }

    // ── Sabotage timer ───────────────────────────────────────────────────────
    if (sabotageTimerRef.current > 0) {
      sabotageTimerRef.current--;
      if (sabotageTimerRef.current === 0) setSabotageActive(false);
    }

    // ── AI update ────────────────────────────────────────────────────────────
    updateAI();

    // ── Render ───────────────────────────────────────────────────────────────
    drawMap(ctx);

    // Draw tasks
    for (const task of tasks) {
      if (human.role === 'crewmate' || task.completed) {
        drawTask(ctx, task);
      }
    }

    // Draw bodies
    for (const body of bodiesRef.current) {
      drawBody(ctx, body);
    }

    // Draw AI players
    for (const p of players) {
      if (p.isAI && p.isAlive) {
        drawPlayer(ctx, p, false, false);
      }
    }

    // Draw human player
    drawPlayer(ctx, human, true, true);

    // Draw task progress bar (crewmate only)
    if (human.role === 'crewmate') {
      const barW = 200;
      const barH = 12;
      const barX = CANVAS_W / 2 - barW / 2;
      const barY = CANVAS_H - 30;
      const progress = Math.min(1, completedTasksRef.current / TOTAL_TASKS_NEEDED);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 8;
      ctx.fillRect(barX, barY, barW * progress, barH);
      ctx.shadowBlur = 0;
      ctx.font = '8px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`TASKS ${completedTasksRef.current}/${TOTAL_TASKS_NEEDED}`, CANVAS_W / 2, barY - 4);
    }

    // Sabotage overlay
    if (sabotageTimerRef.current > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.08 * Math.sin(Date.now() / 200)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [updateAI, checkWinConditions]);

  // ── Event handlers ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };
    canvas.addEventListener('mousemove', onMouseMove);
    return () => canvas.removeEventListener('mousemove', onMouseMove);
  }, []);

  // ── Start animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // ── Action handlers ──────────────────────────────────────────────────────────
  const handleKill = useCallback(() => {
    if (!nearKillTarget) return;
    const players = playersRef.current;
    const target = players.find(p => p.id === nearKillTarget);
    if (!target || !target.isAlive) return;
    target.isAlive = false;
    bodiesRef.current.push({ x: target.x, y: target.y, color: target.color, reportedBy: new Set() });
    setBodies([...bodiesRef.current]);
    setAlivePlayers([...players.filter(p => p.isAlive)]);
    setNearKillTarget(null);
    checkWinConditions();
  }, [nearKillTarget, checkWinConditions]);

  const handleSabotage = useCallback(() => {
    if (sabotageTimerRef.current > 0) return;
    sabotageTimerRef.current = 300;
    setSabotageActive(true);
  }, []);

  const handleTaskClick = useCallback(() => {
    if (!nearTask) return;
    const task = tasksRef.current.find(t => t.id === nearTask);
    if (!task || task.completed) return;

    if (activeTaskRef.current === nearTask) {
      // Toggle off
      task.isActive = false;
      activeTaskRef.current = null;
      isFillingTaskRef.current = false;
      setActiveTask(null);
    } else {
      // Deactivate previous
      if (activeTaskRef.current) {
        const prev = tasksRef.current.find(t => t.id === activeTaskRef.current);
        if (prev) prev.isActive = false;
      }
      task.isActive = true;
      activeTaskRef.current = nearTask;
      isFillingTaskRef.current = true;
      setActiveTask(nearTask);
    }
  }, [nearTask]);

  const handleReport = useCallback(() => {
    if (!nearBody) return;
    // Mark body as reported
    for (const body of bodiesRef.current) {
      const human = playersRef.current.find(p => !p.isAI);
      if (human && dist(human, body) < REPORT_RANGE) {
        body.reportedBy.add('player');
      }
    }
    triggerMeeting();
  }, [nearBody, triggerMeeting]);

  const handleEmergencyMeeting = useCallback(() => {
    if (meetingCooldownRef.current > 0) return;
    triggerMeeting();
  }, [triggerMeeting]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const human = playersRef.current.find(p => !p.isAI);
  const isImpostor = playerRole === 'impostor';

  return (
    <div className="flex flex-col items-center gap-4 select-none" tabIndex={0}>
      {/* Role badge */}
      {phase === 'playing' && (
        <div className={`flex items-center gap-3 px-4 py-2 rounded border font-orbitron text-sm font-bold tracking-widest ${
          isImpostor
            ? 'border-red-500/60 bg-red-500/10 text-red-400'
            : 'border-neon-green/60 bg-neon-green/10 text-neon-green'
        }`}>
          <span>{isImpostor ? '👿 IMPOSTOR' : '✓ CREWMATE'}</span>
          {!isImpostor && (
            <span className="text-xs text-muted-foreground font-rajdhani">
              Tasks: {completedTasks}/{totalTasks}
            </span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-lg border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,245,255,0.1)]"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/85 backdrop-blur-sm">
            <div className="text-center space-y-5 px-6">
              <div className="text-6xl mb-2">🚀</div>
              <h2 className="font-orbitron text-3xl font-black neon-text-cyan tracking-wider">AMONG US</h2>
              <p className="font-rajdhani text-muted-foreground text-base max-w-sm">
                Complete tasks as a Crewmate, or eliminate Crewmates as the Impostor!
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={initGame}
                  className="px-8 py-3 font-orbitron font-bold text-sm tracking-widest bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan rounded hover:bg-neon-cyan/40 transition-all shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                >
                  START GAME
                </button>
                <button
                  onClick={() => setShowInstructions(v => !v)}
                  className="px-6 py-3 font-orbitron font-bold text-sm tracking-widest bg-white/5 border border-white/20 text-white/70 rounded hover:bg-white/10 transition-all"
                >
                  HOW TO PLAY
                </button>
              </div>
              {showInstructions && (
                <div className="text-left bg-black/60 border border-white/10 rounded-lg p-4 text-sm font-rajdhani space-y-2 max-w-sm mx-auto">
                  <p className="text-neon-green font-bold">CREWMATE:</p>
                  <p className="text-muted-foreground">• Move near glowing task icons and click <span className="text-white">DO TASK</span> to fill progress</p>
                  <p className="text-muted-foreground">• Complete all tasks to win</p>
                  <p className="text-neon-pink font-bold mt-2">IMPOSTOR:</p>
                  <p className="text-muted-foreground">• Move near crewmates and click <span className="text-white">KILL</span></p>
                  <p className="text-muted-foreground">• Use <span className="text-white">SABOTAGE</span> to create chaos</p>
                  <p className="text-neon-yellow font-bold mt-2">BOTH ROLES:</p>
                  <p className="text-muted-foreground">• <span className="text-white">WASD / Arrow Keys</span> to move</p>
                  <p className="text-muted-foreground">• Report bodies or call Emergency Meeting to vote</p>
                  <p className="text-muted-foreground">• Vote out the Impostor to win as Crewmate</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* End overlay */}
        {phase === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/85 backdrop-blur-sm">
            <div className="text-center space-y-4">
              {winner === 'crewmates' ? (
                <>
                  <div className="text-5xl">✓</div>
                  <p className="font-orbitron text-4xl font-black neon-text-green animate-pulse">CREWMATES WIN!</p>
                  <p className="font-rajdhani text-lg text-muted-foreground tracking-widest">
                    {winReason === 'tasks' ? 'All tasks completed!' : 'The Impostor was ejected!'}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl">👿</div>
                  <p className="font-orbitron text-4xl font-black neon-text-pink animate-pulse">IMPOSTOR WINS!</p>
                  <p className="font-rajdhani text-lg text-muted-foreground tracking-widest">
                    The Impostor eliminated enough crewmates...
                  </p>
                </>
              )}
              <button
                onClick={initGame}
                className={`mt-4 px-8 py-3 font-orbitron font-bold text-sm tracking-widest rounded transition-all ${
                  winner === 'crewmates'
                    ? 'bg-neon-green/20 border-2 border-neon-green text-neon-green hover:bg-neon-green/40 shadow-[0_0_20px_rgba(57,255,20,0.4)]'
                    : 'bg-neon-pink/20 border-2 border-neon-pink text-neon-pink hover:bg-neon-pink/40 shadow-[0_0_20px_rgba(255,45,85,0.4)]'
                }`}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {phase === 'playing' && (
        <div className="w-full max-w-[800px] flex flex-wrap gap-2 justify-center">
          {/* Crewmate actions */}
          {!isImpostor && nearTask && (
            <button
              onClick={handleTaskClick}
              className={`px-5 py-2 font-orbitron font-bold text-xs tracking-widest rounded border-2 transition-all ${
                activeTask === nearTask
                  ? 'bg-neon-yellow/30 border-neon-yellow text-neon-yellow shadow-[0_0_15px_rgba(255,224,102,0.4)] animate-pulse'
                  : 'bg-neon-yellow/10 border-neon-yellow/60 text-neon-yellow hover:bg-neon-yellow/20'
              }`}
            >
              {activeTask === nearTask ? '⚡ DOING TASK...' : '⚡ DO TASK'}
            </button>
          )}

          {/* Impostor actions */}
          {isImpostor && nearKillTarget && (
            <button
              onClick={handleKill}
              className="px-5 py-2 font-orbitron font-bold text-xs tracking-widest rounded border-2 bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/40 transition-all shadow-[0_0_15px_rgba(255,0,0,0.3)]"
            >
              🔪 KILL
            </button>
          )}
          {isImpostor && (
            <button
              onClick={handleSabotage}
              disabled={sabotageActive}
              className={`px-5 py-2 font-orbitron font-bold text-xs tracking-widest rounded border-2 transition-all ${
                sabotageActive
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-500/40 cursor-not-allowed'
                  : 'bg-orange-500/20 border-orange-500 text-orange-400 hover:bg-orange-500/40 shadow-[0_0_15px_rgba(255,165,0,0.3)]'
              }`}
            >
              💥 SABOTAGE {sabotageActive ? '(ACTIVE)' : ''}
            </button>
          )}

          {/* Shared actions */}
          {nearBody && (
            <button
              onClick={handleReport}
              className="px-5 py-2 font-orbitron font-bold text-xs tracking-widest rounded border-2 bg-red-600/20 border-red-600 text-red-400 hover:bg-red-600/40 transition-all shadow-[0_0_15px_rgba(200,0,0,0.4)] animate-pulse"
            >
              🚨 REPORT BODY
            </button>
          )}

          <button
            onClick={handleEmergencyMeeting}
            disabled={meetingCooldown > 0}
            className={`px-5 py-2 font-orbitron font-bold text-xs tracking-widest rounded border-2 transition-all ${
              meetingCooldown > 0
                ? 'bg-neon-cyan/5 border-neon-cyan/20 text-neon-cyan/30 cursor-not-allowed'
                : 'bg-neon-cyan/10 border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/20 shadow-[0_0_10px_rgba(0,245,255,0.2)]'
            }`}
          >
            📢 MEETING {meetingCooldown > 0 ? `(${Math.ceil(meetingCooldown / 60)}s)` : ''}
          </button>
        </div>
      )}

      {/* Voting overlay */}
      {phase === 'voting' && (
        <div className="w-full max-w-[800px] bg-black/90 border border-neon-cyan/40 rounded-lg p-5 shadow-[0_0_30px_rgba(0,245,255,0.15)]">
          <h3 className="font-orbitron text-lg font-bold text-neon-cyan tracking-widest text-center mb-4">
            🚨 EMERGENCY MEETING — VOTE TO EJECT
          </h3>
          <p className="font-rajdhani text-muted-foreground text-sm text-center mb-4">
            Select a player to eject, or skip the vote.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {alivePlayers.map(p => (
              <button
                key={p.id}
                onClick={() => !hasVoted && setVoteTarget(p.id)}
                disabled={hasVoted}
                className={`flex items-center gap-2 px-3 py-2 rounded border transition-all font-rajdhani text-sm ${
                  voteTarget === p.id
                    ? 'border-neon-yellow bg-neon-yellow/20 text-neon-yellow'
                    : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'
                } ${hasVoted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 border border-white/30"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-bold">{p.name}</span>
                {p.id === 'player' && <span className="text-xs text-muted-foreground">(you)</span>}
              </button>
            ))}

            {/* Skip vote */}
            <button
              onClick={() => !hasVoted && setVoteTarget('skip')}
              disabled={hasVoted}
              className={`flex items-center gap-2 px-3 py-2 rounded border transition-all font-rajdhani text-sm ${
                voteTarget === 'skip'
                  ? 'border-neon-green bg-neon-green/20 text-neon-green'
                  : 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'
              } ${hasVoted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span className="text-base">⏭</span>
              <span className="font-bold">SKIP VOTE</span>
            </button>
          </div>

          {!hasVoted ? (
            <div className="flex justify-center">
              <button
                onClick={submitVote}
                disabled={!voteTarget}
                className={`px-8 py-2 font-orbitron font-bold text-sm tracking-widest rounded border-2 transition-all ${
                  voteTarget
                    ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/40 shadow-[0_0_15px_rgba(0,245,255,0.3)]'
                    : 'bg-white/5 border-white/20 text-white/30 cursor-not-allowed'
                }`}
              >
                CONFIRM VOTE
              </button>
            </div>
          ) : (
            <p className="text-center font-orbitron text-neon-yellow text-sm animate-pulse tracking-widest">
              TALLYING VOTES...
            </p>
          )}
        </div>
      )}

      {/* Controls hint */}
      {phase === 'playing' && (
        <div className="flex gap-4 text-xs font-rajdhani text-muted-foreground">
          <span>🎮 WASD / Arrow Keys to move</span>
          <span>•</span>
          <span>Approach glowing icons to interact</span>
        </div>
      )}
    </div>
  );
}
