import { COLS, ROWS, WALL, DOOR, TUNNEL_ROWS } from './maze.js';
import { isBeatable } from './game.js';

export const TILE = 26;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;

const WALL_FILL = '#121a30';
const WALL_EDGE = '#2f6bff';
const WALL_GLOW = '#5b9dff';

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Walls are drawn once to an offscreen canvas — they never change. */
export function bakeMaze(grid) {
  const c = document.createElement('canvas');
  c.width = WIDTH;
  c.height = HEIGHT;
  const ctx = c.getContext('2d');

  // Rubber gym flooring.
  ctx.fillStyle = '#080a14';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = 'rgba(90,130,220,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE + 0.5, 0);
    ctx.lineTo(x * TILE + 0.5, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE + 0.5);
    ctx.lineTo(WIDTH, y * TILE + 0.5);
    ctx.stroke();
  }

  const solid = (x, y) => {
    if (y < 0 || y >= ROWS) return true;
    if (x < 0 || x >= COLS) return !TUNNEL_ROWS.includes(y);
    return grid[y][x] === WALL;
  };

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== WALL) continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = WALL_FILL;
      ctx.fillRect(px, py, TILE, TILE);
    }
  }

  // Neon trim only where a rack meets the walkway.
  ctx.lineCap = 'round';
  for (const pass of [{ w: 5, c: rgba(WALL_GLOW, 0.16) }, { w: 2, c: WALL_EDGE }]) {
    ctx.strokeStyle = pass.c;
    ctx.lineWidth = pass.w;
    ctx.beginPath();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] !== WALL) continue;
        const px = x * TILE;
        const py = y * TILE;
        const i = 3;
        if (!solid(x, y - 1)) { ctx.moveTo(px + i, py + i); ctx.lineTo(px + TILE - i, py + i); }
        if (!solid(x, y + 1)) { ctx.moveTo(px + i, py + TILE - i); ctx.lineTo(px + TILE - i, py + TILE - i); }
        if (!solid(x - 1, y)) { ctx.moveTo(px + i, py + i); ctx.lineTo(px + i, py + TILE - i); }
        if (!solid(x + 1, y)) { ctx.moveTo(px + TILE - i, py + i); ctx.lineTo(px + TILE - i, py + TILE - i); }
      }
    }
    ctx.stroke();
  }

  // Staff-room door.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] !== DOOR) continue;
      ctx.strokeStyle = '#ff7ad9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x * TILE + 3, y * TILE + TILE / 2);
      ctx.lineTo(x * TILE + TILE - 3, y * TILE + TILE / 2);
      ctx.stroke();
    }
  }
  return c;
}

function drawPellets(ctx, state, t) {
  ctx.fillStyle = '#ffe9b0';
  ctx.shadowColor = 'rgba(255,220,140,0.55)';
  ctx.shadowBlur = 5;
  for (let y = 0; y < ROWS; y++) {
    const row = state.pellets[y];
    if (!row) continue;
    for (let x = 0; x < COLS; x++) {
      if (!row[x]) continue;
      ctx.beginPath();
      ctx.arc(x * TILE + TILE / 2, y * TILE + TILE / 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}

/** Each machine drawn as a little pictogram, no sprite sheet needed. */
function drawEquipmentIcon(ctx, kind, cx, cy, s) {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind) {
    case 'dumbbell':
      ctx.moveTo(cx - s * 0.55, cy); ctx.lineTo(cx + s * 0.55, cy); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.7, cy - s * 0.42); ctx.lineTo(cx - s * 0.7, cy + s * 0.42);
      ctx.moveTo(cx + s * 0.7, cy - s * 0.42); ctx.lineTo(cx + s * 0.7, cy + s * 0.42);
      break;
    case 'barbell':
      ctx.moveTo(cx - s * 0.8, cy); ctx.lineTo(cx + s * 0.8, cy); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy - s * 0.5); ctx.lineTo(cx - s * 0.6, cy + s * 0.5);
      ctx.moveTo(cx - s * 0.82, cy - s * 0.3); ctx.lineTo(cx - s * 0.82, cy + s * 0.3);
      ctx.moveTo(cx + s * 0.6, cy - s * 0.5); ctx.lineTo(cx + s * 0.6, cy + s * 0.5);
      ctx.moveTo(cx + s * 0.82, cy - s * 0.3); ctx.lineTo(cx + s * 0.82, cy + s * 0.3);
      break;
    case 'kettlebell':
      ctx.arc(cx, cy + s * 0.25, s * 0.48, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.35, s * 0.3, Math.PI * 0.15, Math.PI * 0.85, true);
      break;
    case 'bench':
      ctx.moveTo(cx - s * 0.7, cy - s * 0.2); ctx.lineTo(cx + s * 0.7, cy - s * 0.2);
      ctx.moveTo(cx - s * 0.45, cy - s * 0.2); ctx.lineTo(cx - s * 0.55, cy + s * 0.55);
      ctx.moveTo(cx + s * 0.45, cy - s * 0.2); ctx.lineTo(cx + s * 0.55, cy + s * 0.55);
      break;
    case 'rack':
      ctx.moveTo(cx - s * 0.55, cy - s * 0.6); ctx.lineTo(cx - s * 0.55, cy + s * 0.6);
      ctx.moveTo(cx + s * 0.55, cy - s * 0.6); ctx.lineTo(cx + s * 0.55, cy + s * 0.6);
      ctx.moveTo(cx - s * 0.8, cy - s * 0.15); ctx.lineTo(cx + s * 0.8, cy - s * 0.15);
      break;
    case 'treadmill':
      ctx.moveTo(cx - s * 0.75, cy + s * 0.45); ctx.lineTo(cx + s * 0.5, cy + s * 0.45);
      ctx.lineTo(cx + s * 0.75, cy - s * 0.15);
      ctx.moveTo(cx + s * 0.75, cy - s * 0.15); ctx.lineTo(cx + s * 0.3, cy - s * 0.15);
      break;
    case 'rower':
      ctx.moveTo(cx - s * 0.8, cy + s * 0.4); ctx.lineTo(cx + s * 0.8, cy + s * 0.4);
      ctx.moveTo(cx - s * 0.1, cy + s * 0.4); ctx.lineTo(cx - s * 0.1, cy - s * 0.1);
      ctx.moveTo(cx - s * 0.5, cy - s * 0.35); ctx.lineTo(cx + s * 0.45, cy - s * 0.35);
      break;
    case 'cable':
    default:
      ctx.moveTo(cx - s * 0.6, cy - s * 0.6); ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
      ctx.moveTo(cx - s * 0.6, cy - s * 0.5); ctx.lineTo(cx + s * 0.45, cy - s * 0.5);
      ctx.lineTo(cx + s * 0.45, cy + s * 0.1);
      ctx.moveTo(cx + s * 0.2, cy + s * 0.1); ctx.lineTo(cx + s * 0.7, cy + s * 0.1);
      break;
  }
  ctx.stroke();
}

function drawEquipment(ctx, state, t) {
  for (const eq of state.equipment) {
    if (eq.taken) continue;
    const cx = eq.x * TILE + TILE / 2;
    const cy = eq.y * TILE + TILE / 2;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + eq.x + eq.y);

    ctx.save();
    ctx.strokeStyle = rgba('#ffe066', 0.25 + pulse * 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = 'rgba(255,215,90,0.9)';
    ctx.shadowBlur = 10 + pulse * 8;
    ctx.strokeStyle = '#ffe066';
    drawEquipmentIcon(ctx, eq.kind, cx, cy, TILE * 0.34);
    ctx.restore();
  }
}

function bodyColor(gains) {
  const stops = ['#ffd23f', '#ffc02e', '#ffa71f', '#ff8c14', '#ff6f10', '#ff550f', '#ff3d16', '#ff2a2a'];
  return stops[Math.min(stops.length - 1, gains)];
}

function drawPlayer(ctx, state, t) {
  const p = state.player;
  const pumped = state.pump > 0;
  const r = TILE * (0.38 + Math.min(state.gains, 11) * 0.011);
  const angle = Math.atan2(p.dir.y, p.dir.x);
  const chomp = state.status === 'playing'
    ? (Math.abs(Math.sin(p.mouth)) * 0.32 + 0.04) * Math.PI
    : 0.25 * Math.PI;

  const draw = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);

    if (pumped) {
      const glow = 0.45 + 0.3 * Math.sin(t * 14);
      ctx.shadowColor = `rgba(255,90,40,${glow})`;
      ctx.shadowBlur = 26;
    } else if (state.gains > 0) {
      ctx.shadowColor = 'rgba(255,170,60,0.35)';
      ctx.shadowBlur = 10;
    }

    ctx.rotate(angle);
    // Dying = deflating.
    const squish = state.status === 'dying' ? Math.max(0.15, state.statusTimer / 1.7) : 1;
    ctx.scale(squish, squish);

    ctx.fillStyle = bodyColor(state.gains);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, chomp, Math.PI * 2 - chomp);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Delts: the bigger the gains, the wider the bro.
    if (state.gains >= 2) {
      ctx.fillStyle = rgba('#ff8c14', 0.9);
      const bulge = r * (0.18 + state.gains * 0.022);
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.72, bulge, 0, Math.PI * 2);
      ctx.arc(-r * 0.35, r * 0.72, bulge, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(-angle);
    // Sweatband.
    ctx.fillStyle = '#2de2ff';
    ctx.fillRect(-r * 0.85, -r * 0.72, r * 1.7, r * 0.26);

    // Eye.
    ctx.fillStyle = '#10131f';
    ctx.beginPath();
    ctx.arc(r * 0.1 * Math.sign(p.dir.x || 1), -r * 0.3, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (pumped) {
      // Flying sweat.
      ctx.fillStyle = 'rgba(150,220,255,0.8)';
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * 2.1;
        ctx.beginPath();
        ctx.arc(cx - p.dir.x * TILE * 0.6 + Math.cos(a) * 7, cy - p.dir.y * TILE * 0.6 + Math.sin(a) * 7, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const px = p.x * TILE + TILE / 2;
  const py = p.y * TILE + TILE / 2;
  if (state.grace > 0 && Math.floor(t * 12) % 2 === 0 && state.status === 'playing') return;
  draw(px, py);
  if (p.x < 1) draw(px + WIDTH, py);
  if (p.x > COLS - 1) draw(px - WIDTH, py);
}

function ghostBody(ctx, r, wob) {
  ctx.beginPath();
  ctx.arc(0, -r * 0.12, r, Math.PI, 0);
  ctx.lineTo(r, r * 0.72);
  const feet = 4;
  for (let i = 0; i < feet; i++) {
    const x0 = r - (i * 2 * r) / feet;
    const x1 = r - ((i + 1) * 2 * r) / feet;
    const mid = (x0 + x1) / 2;
    const lift = i % 2 === 0 ? r * 0.28 : -r * 0.1;
    ctx.quadraticCurveTo(mid, r * 0.72 - lift + Math.sin(wob + i) * 2, x1, r * 0.72);
  }
  ctx.lineTo(-r, -r * 0.12);
  ctx.closePath();
}

function drawEyes(ctx, r, dir, color) {
  const ex = dir.x * r * 0.22;
  const ey = dir.y * r * 0.22;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(side * r * 0.38, -r * 0.18, r * 0.27, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(side * r * 0.38 + ex, -r * 0.18 + ey, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Little pips over each head: how strong they are vs how strong you are. */
function drawStrengthPips(ctx, user, state, r) {
  const outranked = state.gains > user.strength;
  const total = user.strength;
  const w = 3.5;
  const gap = 1.8;
  const totalW = total * w + (total - 1) * gap;
  const y = -r * 1.62;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = outranked ? 'rgba(110,255,180,0.85)' : 'rgba(255,90,90,0.9)';
    ctx.fillRect(-totalW / 2 + i * (w + gap), y, w, 4);
  }
}

function drawAccessory(ctx, user, r) {
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  switch (user.id) {
    case 'bunny': // ponytail
      ctx.strokeStyle = '#ffd6f3';
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.5);
      ctx.quadraticCurveTo(-r * 1.5, -r * 0.1, -r * 1.15, r * 0.5);
      ctx.stroke();
      break;
    case 'influencer': // phone held out front
      ctx.fillStyle = '#101520';
      ctx.fillRect(r * 0.72, -r * 0.62, r * 0.42, r * 0.72);
      ctx.fillStyle = '#9ef7dd';
      ctx.fillRect(r * 0.78, -r * 0.55, r * 0.3, r * 0.58);
      break;
    case 'rat': // angry brows
      ctx.strokeStyle = '#2a0b0b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, -r * 0.62); ctx.lineTo(-r * 0.14, -r * 0.42);
      ctx.moveTo(r * 0.68, -r * 0.62); ctx.lineTo(r * 0.14, -r * 0.42);
      ctx.stroke();
      break;
    case 'crossfit': // headband
      ctx.fillStyle = '#fff0d2';
      ctx.fillRect(-r * 0.95, -r * 0.78, r * 1.9, r * 0.24);
      break;
    case 'powerlifter': // lifting belt
      ctx.fillStyle = '#3b2a12';
      ctx.fillRect(-r, r * 0.18, r * 2, r * 0.3);
      ctx.fillStyle = '#d8b45a';
      ctx.fillRect(-r * 0.18, r * 0.14, r * 0.36, r * 0.38);
      break;
    default:
      break;
  }
}

function drawUsers(ctx, state, t) {
  for (const user of state.users) {
    const r = TILE * (user.id === 'powerlifter' ? 0.46 : 0.4);
    const flee = state.pump > 0 && user.state === 'loose';
    const ending = flee && state.pump < 2 && Math.floor(t * 9) % 2 === 0;
    const humbled = user.state === 'humbled';
    const outranked = !flee && isBeatable(state, user);

    const draw = (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);

      if (humbled) {
        // Beaten: just a pair of eyes limping back to the staff room.
        drawEyes(ctx, r, user.dir, '#6fa8ff');
        ctx.restore();
        return;
      }

      let fill = user.color;
      if (flee) fill = ending ? '#ffffff' : '#2f6bff';

      ctx.shadowColor = flee ? 'rgba(60,120,255,0.6)' : rgba(user.color, 0.5);
      ctx.shadowBlur = 12;
      ctx.fillStyle = fill;
      ghostBody(ctx, r, t * 8 + user.wobble);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (outranked) {
        // You out-lift them: they're visibly nervous.
        ctx.strokeStyle = 'rgba(140,255,200,0.9)';
        ctx.lineWidth = 1.5;
        ghostBody(ctx, r, t * 8 + user.wobble);
        ctx.stroke();
      }

      if (flee) {
        ctx.fillStyle = ending ? '#ff3b3b' : '#9ed0ff';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * r * 0.34, -r * 0.22, r * 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const x = -r * 0.6 + (i * r * 1.2) / 6;
          const y = r * 0.3 + (i % 2 === 0 ? 0 : -r * 0.16);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        drawAccessory(ctx, user, r);
        drawEyes(ctx, r, user.dir, '#1b2440');
        drawStrengthPips(ctx, user, state, r);
      }
      ctx.restore();
    };

    const px = user.x * TILE + TILE / 2;
    const py = user.y * TILE + TILE / 2;
    draw(px, py);
    if (user.x < 1) draw(px + WIDTH, py);
    if (user.x > COLS - 1) draw(px - WIDTH, py);
  }
}

function drawPopups(ctx, state) {
  ctx.textAlign = 'center';
  ctx.font = '700 11px ui-monospace, Menlo, monospace';
  for (const pop of state.popups) {
    ctx.globalAlpha = Math.min(1, pop.life * 1.6);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x * TILE + TILE / 2, pop.y * TILE + TILE / 2);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, lines, t) {
  ctx.save();
  ctx.textAlign = 'center';
  const cy = HEIGHT / 2 + TILE * 1.5;
  ctx.fillStyle = 'rgba(6,8,16,0.82)';
  ctx.fillRect(0, cy - 34, WIDTH, 62);
  ctx.strokeStyle = 'rgba(45,226,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy - 34); ctx.lineTo(WIDTH, cy - 34);
  ctx.moveTo(0, cy + 28); ctx.lineTo(WIDTH, cy + 28);
  ctx.stroke();

  ctx.fillStyle = '#ffe066';
  ctx.font = '700 16px ui-monospace, Menlo, monospace';
  ctx.fillText(lines[0], WIDTH / 2, cy - 10);
  if (lines[1]) {
    ctx.fillStyle = 'rgba(200,220,255,0.75)';
    ctx.font = '600 11px ui-monospace, Menlo, monospace';
    ctx.fillText(lines[1], WIDTH / 2, cy + 12);
  }
  ctx.restore();
}

export function render(ctx, state, maze, t) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 6;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  ctx.clearRect(-20, -20, WIDTH + 40, HEIGHT + 40);
  ctx.drawImage(maze, 0, 0);
  drawPellets(ctx, state, t);
  drawEquipment(ctx, state, t);
  drawUsers(ctx, state, t);
  if (state.player) drawPlayer(ctx, state, t);
  drawPopups(ctx, state);

  if (state.status === 'ready') {
    drawBanner(ctx, ['ROUND ' + state.level, 'DO NOT MAKE EYE CONTACT'], t);
  } else if (state.status === 'levelclear') {
    drawBanner(ctx, ['FLOOR CLEARED', 'THEY RESPECT YOU NOW'], t);
  } else if (state.status === 'dying') {
    drawBanner(ctx, ['YOU GOT BEATEN UP', 'SHOULD HAVE WARMED UP'], t);
  }
  ctx.restore();
}
