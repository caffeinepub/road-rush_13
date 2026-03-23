import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface GameScreenProps {
  onGameOver: (score: number) => void;
  onMenu: () => void;
}

// Canvas drawing colors (literal values - cannot use CSS vars in canvas API)
const COLORS = {
  grass: "#1a3a1a",
  grassStripe: "#163216",
  road: "#2a2a2a",
  shoulder: "#3a3a3a",
  player: "#f59a23",
  playerDark: "#c47a15",
  hud: "rgba(11, 18, 32, 0.85)",
  pauseOverlay: "rgba(7, 13, 22, 0.8)",
  enemyColors: [
    "#e53e3e",
    "#4299e1",
    "#ecc94b",
    "#f0f0f0",
    "#9f7aea",
    "#48bb78",
  ],
  powerupShield: "#3b82f6",
  powerupSlowmo: "#f59e0b",
};

const CAR_WIDTH = 48;
const CAR_HEIGHT = 80;
const ROAD_WIDTH = 360;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const INITIAL_SPEED = 200;
const MAX_SPEED = 800;
const SPEED_INCREMENT = 15;
const DASH_HEIGHT = 40;
const DASH_GAP = 30;
const DASH_INTERVAL = DASH_HEIGHT + DASH_GAP;
const POWERUP_SIZE = 36;
const POWERUP_SPAWN_INTERVAL = 5.0; // seconds

interface EnemyCar {
  id: number;
  lane: number;
  y: number;
  color: string;
  speedMult: number;
}

interface PowerUp {
  id: number;
  lane: number;
  y: number;
  type: "shield" | "slowmo";
}

interface GameState {
  running: boolean;
  paused: boolean;
  playerLane: number;
  playerX: number;
  playerTargetX: number;
  enemies: EnemyCar[];
  powerups: PowerUp[];
  score: number;
  speed: number;
  roadOffset: number;
  spawnTimer: number;
  spawnInterval: number;
  nextEnemyId: number;
  nextPowerupId: number;
  laneCooldown: number;
  keys: Set<string>;
  shieldActive: boolean;
  slowmoTimer: number;
  powerupSpawnTimer: number;
  shieldFlash: number; // countdown for white flash
}

function getCanvasRoad(canvas: HTMLCanvasElement): number {
  return (canvas.width - ROAD_WIDTH) / 2;
}

function getLaneX(roadLeft: number, lane: number): number {
  return roadLeft + lane * LANE_WIDTH + LANE_WIDTH / 2 - CAR_WIDTH / 2;
}

function getLaneCenterX(roadLeft: number, lane: number): number {
  return roadLeft + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function shadeColor(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyColor: string,
  darkColor: string,
  isPlayer: boolean,
) {
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(x, y, CAR_WIDTH, CAR_HEIGHT, 6);
  ctx.fill();

  ctx.fillStyle = darkColor;
  const windH = CAR_HEIGHT * 0.2;
  const windY = isPlayer ? y + CAR_HEIGHT * 0.1 : y + CAR_HEIGHT * 0.65;
  ctx.beginPath();
  ctx.roundRect(x + 6, windY, CAR_WIDTH - 12, windH, 3);
  ctx.fill();

  ctx.fillStyle = "#111";
  const wheelW = 8;
  const wheelH = 18;
  const positions: [number, number][] = [
    [x - 4, y + 10],
    [x + CAR_WIDTH - 4, y + 10],
    [x - 4, y + CAR_HEIGHT - 10 - wheelH],
    [x + CAR_WIDTH - 4, y + CAR_HEIGHT - 10 - wheelH],
  ];
  for (const [wx, wy] of positions) {
    ctx.beginPath();
    ctx.roundRect(wx, wy, wheelW, wheelH, 2);
    ctx.fill();
  }

  if (isPlayer) {
    ctx.fillStyle = "#ffe97a";
    ctx.beginPath();
    ctx.roundRect(x + 4, y + CAR_HEIGHT - 8, 12, 6, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + CAR_WIDTH - 16, y + CAR_HEIGHT - 8, 12, 6, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, 10, 5, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + CAR_WIDTH - 14, y + 4, 10, 5, 2);
    ctx.fill();
  }
}

function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  type: "shield" | "slowmo",
  time: number,
) {
  const r = POWERUP_SIZE / 2;
  const pulse = 0.85 + 0.15 * Math.sin(time * 4);

  // Outer glow
  const glowColor = type === "shield" ? "rgba(59,130,246," : "rgba(245,158,11,";
  const gradient = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.6);
  gradient.addColorStop(0, `${glowColor}0.5)`);
  gradient.addColorStop(1, `${glowColor}0)`);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Circle body
  ctx.beginPath();
  ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = type === "shield" ? "#1d4ed8" : "#b45309";
  ctx.fill();
  ctx.strokeStyle = type === "shield" ? "#93c5fd" : "#fcd34d";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Icon
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (type === "shield") {
    // Draw a small shield shape
    ctx.font = `bold ${Math.round(r)}px sans-serif`;
    ctx.fillText("S", cx, cy + 1);
  } else {
    // Lightning bolt
    ctx.fillText("⚡", cx, cy + 1);
  }
  ctx.textBaseline = "alphabetic";
}

function drawShieldRing(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  playerY: number,
  time: number,
) {
  const cx = playerX + CAR_WIDTH / 2;
  const cy = playerY + CAR_HEIGHT / 2;
  const rx = CAR_WIDTH / 2 + 10;
  const ry = CAR_HEIGHT / 2 + 10;
  const alpha = 0.5 + 0.4 * Math.sin(time * 5);

  ctx.save();
  ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Second inner ring
  ctx.strokeStyle = `rgba(147,197,253,${alpha * 0.6})`;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 5, ry - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFrame(canvas: HTMLCanvasElement, state: GameState, time: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const roadLeft = getCanvasRoad(canvas);
  const roadRight = roadLeft + ROAD_WIDTH;

  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, W, H);

  const stripeCount = Math.ceil(H / 60) + 1;
  const grassOffset = (state.roadOffset * 0.5) % 60;
  ctx.fillStyle = COLORS.grassStripe;
  for (let i = -1; i < stripeCount; i++) {
    const sy = i * 60 + grassOffset;
    ctx.fillRect(0, sy, roadLeft - 2, 30);
    ctx.fillRect(roadRight + 2, sy, W - roadRight - 2, 30);
  }

  ctx.fillStyle = COLORS.shoulder;
  ctx.fillRect(roadLeft - 8, 0, 8, H);
  ctx.fillRect(roadRight, 0, 8, H);

  ctx.fillStyle = COLORS.road;
  ctx.fillRect(roadLeft, 0, ROAD_WIDTH, H);

  ctx.setLineDash([DASH_HEIGHT, DASH_GAP]);
  ctx.lineDashOffset = -(state.roadOffset % DASH_INTERVAL);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 3;
  for (let i = 1; i < LANE_COUNT; i++) {
    const lx = roadLeft + i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(roadLeft, 0);
  ctx.lineTo(roadLeft, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(roadRight, 0);
  ctx.lineTo(roadRight, H);
  ctx.stroke();

  // Draw power-ups
  for (const pu of state.powerups) {
    const cx = getLaneCenterX(roadLeft, pu.lane);
    drawPowerUp(ctx, cx, pu.y + POWERUP_SIZE / 2, pu.type, time);
  }

  for (const enemy of state.enemies) {
    const ex = getLaneX(roadLeft, enemy.lane);
    const darkColor = shadeColor(enemy.color, -40);
    drawCar(ctx, ex, enemy.y, enemy.color, darkColor, false);
  }

  const playerY = H - CAR_HEIGHT - 40;

  // Draw shield ring before player
  if (state.shieldActive) {
    drawShieldRing(ctx, state.playerX, playerY, time);
  }

  drawCar(ctx, state.playerX, playerY, COLORS.player, COLORS.playerDark, true);

  // Shield flash overlay
  if (state.shieldFlash > 0) {
    const alpha = state.shieldFlash * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.paused) {
    ctx.fillStyle = COLORS.pauseOverlay;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f2f5f9";
    ctx.font = "bold 48px 'Bricolage Grotesque', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2 - 20);
    ctx.font = "20px 'General Sans', sans-serif";
    ctx.fillStyle = "rgba(169,179,194,0.9)";
    ctx.fillText("Press ESC or tap \u25B6 to resume", W / 2, H / 2 + 24);
  }
}

function checkCollision(state: GameState, canvas: HTMLCanvasElement): boolean {
  const roadLeft = getCanvasRoad(canvas);
  const playerY = canvas.height - CAR_HEIGHT - 40;
  const px = state.playerX;
  const py = playerY;
  const margin = 8;

  for (const enemy of state.enemies) {
    const ex = getLaneX(roadLeft, enemy.lane);
    const ey = enemy.y;
    if (
      px + CAR_WIDTH - margin > ex + margin &&
      px + margin < ex + CAR_WIDTH - margin &&
      py + CAR_HEIGHT - margin > ey + margin &&
      py + margin < ey + CAR_HEIGHT - margin
    ) {
      return true;
    }
  }
  return false;
}

function checkPowerUpCollision(
  state: GameState,
  canvas: HTMLCanvasElement,
): PowerUp | null {
  const roadLeft = getCanvasRoad(canvas);
  const playerY = canvas.height - CAR_HEIGHT - 40;
  const px = state.playerX;
  const py = playerY;
  const margin = 4;

  for (const pu of state.powerups) {
    const pux = getLaneCenterX(roadLeft, pu.lane) - POWERUP_SIZE / 2;
    const puy = pu.y;
    if (
      px + CAR_WIDTH - margin > pux + margin &&
      px + margin < pux + POWERUP_SIZE - margin &&
      py + CAR_HEIGHT - margin > puy + margin &&
      py + margin < puy + POWERUP_SIZE - margin
    ) {
      return pu;
    }
  }
  return null;
}

export default function GameScreen({ onGameOver, onMenu }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const [paused, setPaused] = useState(false);
  const [hudScore, setHudScore] = useState(0);
  const [hudSpeed, setHudSpeed] = useState(INITIAL_SPEED);
  const [showSpeedFlash, setShowSpeedFlash] = useState(false);
  const [hudShield, setHudShield] = useState(false);
  const [hudSlowmo, setHudSlowmo] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: game loop intentionally uses refs
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state || !state.running) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    if (!state.paused) {
      gameTimeRef.current += dt;

      // Slowmo timer
      if (state.slowmoTimer > 0) {
        state.slowmoTimer = Math.max(0, state.slowmoTimer - dt);
      }

      const speedMult = state.slowmoTimer > 0 ? 0.4 : 1.0;

      const prevSpeed = state.speed;
      state.speed = Math.min(
        state.speed + SPEED_INCREMENT * dt * speedMult,
        MAX_SPEED,
      );
      if (Math.floor(state.speed / 50) > Math.floor(prevSpeed / 50)) {
        setShowSpeedFlash(true);
        setTimeout(() => setShowSpeedFlash(false), 500);
      }

      state.roadOffset += state.speed * dt * speedMult;
      state.score = Math.floor(state.roadOffset / 10);

      if (state.laneCooldown > 0) state.laneCooldown -= dt * 1000;

      if (state.laneCooldown <= 0) {
        if (
          state.keys.has("ArrowLeft") ||
          state.keys.has("a") ||
          state.keys.has("A")
        ) {
          if (state.playerLane > 0) {
            state.playerLane -= 1;
            state.laneCooldown = 200;
          }
        }
        if (
          state.keys.has("ArrowRight") ||
          state.keys.has("d") ||
          state.keys.has("D")
        ) {
          if (state.playerLane < LANE_COUNT - 1) {
            state.playerLane += 1;
            state.laneCooldown = 200;
          }
        }
      }

      const roadLeft = getCanvasRoad(canvas);
      state.playerTargetX = getLaneX(roadLeft, state.playerLane);
      state.playerX += (state.playerTargetX - state.playerX) * 10 * dt;

      state.spawnTimer += dt * 1000;
      state.spawnInterval = Math.max(
        600,
        2000 - (state.speed - INITIAL_SPEED) * 2,
      );
      if (state.spawnTimer >= state.spawnInterval) {
        state.spawnTimer = 0;
        const usedLanes = state.enemies
          .filter((e) => e.y < CAR_HEIGHT * 2)
          .map((e) => e.lane);
        const availableLanes = [0, 1, 2].filter((l) => !usedLanes.includes(l));
        if (availableLanes.length > 0) {
          const lane =
            availableLanes[Math.floor(Math.random() * availableLanes.length)];
          state.enemies.push({
            id: state.nextEnemyId++,
            lane,
            y: -CAR_HEIGHT - 10,
            color:
              COLORS.enemyColors[
                Math.floor(Math.random() * COLORS.enemyColors.length)
              ],
            speedMult: 0.9 + Math.random() * 0.4,
          });
        }
      }

      // Powerup spawn (~every 5 seconds, only one on screen)
      state.powerupSpawnTimer += dt;
      if (
        state.powerupSpawnTimer >= POWERUP_SPAWN_INTERVAL &&
        state.powerups.length === 0
      ) {
        state.powerupSpawnTimer = 0;
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const type: "shield" | "slowmo" =
          Math.random() < 0.5 ? "shield" : "slowmo";
        state.powerups.push({
          id: state.nextPowerupId++,
          lane,
          y: -POWERUP_SIZE - 10,
          type,
        });
      }

      state.enemies = state.enemies
        .map((e) => ({
          ...e,
          y: e.y + state.speed * e.speedMult * dt * speedMult,
        }))
        .filter((e) => e.y < canvas.height + CAR_HEIGHT);

      // Move power-ups
      state.powerups = state.powerups
        .map((pu) => ({ ...pu, y: pu.y + state.speed * 0.6 * dt * speedMult }))
        .filter((pu) => pu.y < canvas.height + POWERUP_SIZE);

      // Check power-up collection
      const collectedPu = checkPowerUpCollision(state, canvas);
      if (collectedPu) {
        state.powerups = state.powerups.filter((p) => p.id !== collectedPu.id);
        if (collectedPu.type === "shield") {
          state.shieldActive = true;
        } else {
          state.slowmoTimer = 3.0;
        }
      }

      // Shield flash decay
      if (state.shieldFlash > 0) {
        state.shieldFlash = Math.max(0, state.shieldFlash - dt * 3);
      }

      // Check enemy collision
      if (checkCollision(state, canvas)) {
        if (state.shieldActive) {
          // Consume shield
          state.shieldActive = false;
          state.shieldFlash = 1.0;
          // Push colliding enemies away (remove them)
          const roadLeft2 = getCanvasRoad(canvas);
          const playerY2 = canvas.height - CAR_HEIGHT - 40;
          const px2 = state.playerX;
          const py2 = playerY2;
          const margin2 = 8;
          state.enemies = state.enemies.filter((enemy) => {
            const ex2 = getLaneX(roadLeft2, enemy.lane);
            const ey2 = enemy.y;
            const hit =
              px2 + CAR_WIDTH - margin2 > ex2 + margin2 &&
              px2 + margin2 < ex2 + CAR_WIDTH - margin2 &&
              py2 + CAR_HEIGHT - margin2 > ey2 + margin2 &&
              py2 + margin2 < ey2 + CAR_HEIGHT - margin2;
            return !hit;
          });
        } else {
          state.running = false;
          onGameOverRef.current(state.score);
          return;
        }
      }

      setHudScore(state.score);
      setHudSpeed(Math.round(state.speed));
      setHudShield(state.shieldActive);
      setHudSlowmo(state.slowmoTimer);
    }

    drawFrame(canvas, state, gameTimeRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (stateRef.current) {
        const roadLeft = getCanvasRoad(canvas);
        stateRef.current.playerTargetX = getLaneX(
          roadLeft,
          stateRef.current.playerLane,
        );
        stateRef.current.playerX = stateRef.current.playerTargetX;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const roadLeft = getCanvasRoad(canvas);
    const startLane = 1;
    const startX = getLaneX(roadLeft, startLane);
    stateRef.current = {
      running: true,
      paused: false,
      playerLane: startLane,
      playerX: startX,
      playerTargetX: startX,
      enemies: [],
      powerups: [],
      score: 0,
      speed: INITIAL_SPEED,
      roadOffset: 0,
      spawnTimer: 0,
      spawnInterval: 2000,
      nextEnemyId: 0,
      nextPowerupId: 0,
      laneCooldown: 0,
      keys: new Set(),
      shieldActive: false,
      slowmoTimer: 0,
      powerupSpawnTimer: 0,
      shieldFlash: 0,
    };

    lastTimeRef.current = performance.now();
    gameTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: gameLoop is stable
  }, [gameLoop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "Escape") {
        state.paused = !state.paused;
        setPaused(state.paused);
        if (!state.paused) lastTimeRef.current = performance.now();
      }
      state.keys.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current?.keys.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const togglePause = () => {
    const state = stateRef.current;
    if (!state) return;
    state.paused = !state.paused;
    setPaused(state.paused);
    if (!state.paused) lastTimeRef.current = performance.now();
  };

  const handleTouchLeft = () => {
    const state = stateRef.current;
    if (!state || state.paused) return;
    if (state.laneCooldown <= 0 && state.playerLane > 0) {
      state.playerLane -= 1;
      state.laneCooldown = 200;
    }
  };

  const handleTouchRight = () => {
    const state = stateRef.current;
    if (!state || state.paused) return;
    if (state.laneCooldown <= 0 && state.playerLane < LANE_COUNT - 1) {
      state.playerLane += 1;
      state.laneCooldown = 200;
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" tabIndex={0} />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none">
        <div
          className="flex flex-col px-4 py-2 rounded-xl text-sm"
          style={{ background: COLORS.hud }}
        >
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "#a9b3c2" }}
          >
            Score
          </span>
          <span
            data-ocid="game.score.panel"
            className="font-display font-bold text-2xl"
            style={{ color: "#f2f5f9" }}
          >
            {hudScore.toLocaleString()}
          </span>
        </div>

        <div className="pointer-events-auto flex gap-2 items-center">
          {showSpeedFlash && (
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{ background: "rgba(245,154,35,0.2)", color: "#f59a23" }}
            >
              SPEED UP!
            </span>
          )}
          <button
            type="button"
            data-ocid="game.pause.toggle"
            onClick={togglePause}
            className="p-2 rounded-xl transition-colors"
            style={{ background: COLORS.hud }}
          >
            {paused ? (
              <Play className="w-5 h-5" style={{ color: "#f2f5f9" }} />
            ) : (
              <Pause className="w-5 h-5" style={{ color: "#f2f5f9" }} />
            )}
          </button>
          <button
            type="button"
            data-ocid="game.menu.button"
            onClick={onMenu}
            className="p-2 rounded-xl transition-colors"
            style={{ background: COLORS.hud }}
          >
            <X className="w-5 h-5" style={{ color: "#f2f5f9" }} />
          </button>
        </div>

        <div
          className="flex flex-col items-end px-4 py-2 rounded-xl text-sm"
          style={{ background: COLORS.hud }}
        >
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "#a9b3c2" }}
          >
            Speed
          </span>
          <span
            data-ocid="game.speed.panel"
            className="font-display font-bold text-2xl"
            style={{ color: "#f59a23" }}
          >
            {hudSpeed}
          </span>
        </div>
      </div>

      {/* Power-up badges */}
      {(hudShield || hudSlowmo > 0) && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none"
          data-ocid="game.powerup.panel"
        >
          {hudShield && (
            <span
              data-ocid="game.shield.toggle"
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                background: "rgba(29,78,216,0.85)",
                color: "#93c5fd",
                border: "1px solid rgba(96,165,250,0.6)",
                boxShadow: "0 0 12px rgba(59,130,246,0.5)",
              }}
            >
              🛡 SHIELD
            </span>
          )}
          {hudSlowmo > 0 && (
            <span
              data-ocid="game.slowmo.toggle"
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                background: "rgba(120,53,15,0.85)",
                color: "#fcd34d",
                border: "1px solid rgba(245,158,11,0.6)",
                boxShadow: "0 0 12px rgba(245,158,11,0.5)",
              }}
            >
              ⚡ SLOW ×0.4 &nbsp;{hudSlowmo.toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {/* Touch controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6 pointer-events-none md:hidden">
        <button
          type="button"
          data-ocid="game.touch_left.button"
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchLeft();
          }}
          onClick={handleTouchLeft}
          className="pointer-events-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold select-none active:scale-95 transition-transform"
          style={{
            background: "rgba(11,18,32,0.7)",
            border: "2px solid rgba(245,154,35,0.4)",
            color: "#f59a23",
          }}
        >
          ←
        </button>
        <button
          type="button"
          data-ocid="game.touch_right.button"
          onTouchStart={(e) => {
            e.preventDefault();
            handleTouchRight();
          }}
          onClick={handleTouchRight}
          className="pointer-events-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold select-none active:scale-95 transition-transform"
          style={{
            background: "rgba(11,18,32,0.7)",
            border: "2px solid rgba(245,154,35,0.4)",
            color: "#f59a23",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
