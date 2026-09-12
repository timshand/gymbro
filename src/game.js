import {
  COLS, ROWS, FLOOR, buildGrid, pelletCells, isWalkable, wrapX,
  EQUIPMENT, PLAYER_START, PEN_DOOR, PEN_CENTER, PEN_SLOTS, SCATTER_CORNERS,
} from './maze.js';
import {
  GYM_USERS, WAVES, PUMP_SECONDS, BASE_PLAYER_SPEED, BASE_USER_SPEED, SCORE,
} from './characters.js';

export const DIRS = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};
const DIR_ORDER = [DIRS.up, DIRS.left, DIRS.down, DIRS.right];
const EPS = 1e-6;
const TOUCH_RANGE = 0.72;

// How many gym users are on the floor at each round.
function crowdSize(level) {
  return Math.min(GYM_USERS.length, 2 + level);
}

function isCentered(e) {
  return Math.abs(e.x - Math.round(e.x)) < EPS && Math.abs(e.y - Math.round(e.y)) < EPS;
}

function sameDir(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

function opposite(a, b) {
  return a && b && a.x === -b.x && a.y === -b.y;
}

function dist2(ax, ay, bx, by) {
  // Account for the wrap-around tunnels so nobody chases the long way round.
  let dx = Math.abs(ax - bx);
  if (dx > COLS / 2) dx = COLS - dx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Slides an entity along its lane, handing control back at every tile centre. */
function advance(ent, dist, grid, opts, onCenter) {
  let remaining = dist;
  let guard = 0;
  while (remaining > EPS && guard++ < 128) {
    if (isCentered(ent)) {
      onCenter(ent);
      const cx = Math.round(ent.x);
      const cy = Math.round(ent.y);
      if (!ent.dir || (!ent.dir.x && !ent.dir.y)) break;
      if (!isWalkable(grid, cx + ent.dir.x, cy + ent.dir.y, opts)) break;
    }
    const { x: dx, y: dy } = ent.dir;
    let nextX = ent.x;
    let nextY = ent.y;
    if (dx > 0) nextX = Math.floor(ent.x + EPS) + 1;
    else if (dx < 0) nextX = Math.ceil(ent.x - EPS) - 1;
    if (dy > 0) nextY = Math.floor(ent.y + EPS) + 1;
    else if (dy < 0) nextY = Math.ceil(ent.y - EPS) - 1;

    const segment = Math.abs(nextX - ent.x) + Math.abs(nextY - ent.y);
    if (segment > remaining + EPS) {
      ent.x += dx * remaining;
      ent.y += dy * remaining;
      remaining = 0;
    } else {
      ent.x = nextX;
      ent.y = nextY;
      remaining -= segment;
      if (ent.x <= -1) ent.x = COLS - 1;
      else if (ent.x >= COLS) ent.x = 0;
    }
  }
}

/** Shortest-path first step — used when a humbled gym user limps back to the staff room. */
function bfsStep(grid, from, to, opts) {
  const start = wrapX(Math.round(from.x)) + ',' + Math.round(from.y);
  const goal = wrapX(Math.round(to.x)) + ',' + Math.round(to.y);
  if (start === goal) return null;
  const prev = new Map([[start, null]]);
  const queue = [[wrapX(Math.round(from.x)), Math.round(from.y)]];
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    for (const d of DIR_ORDER) {
      const nx = wrapX(x + d.x);
      const ny = y + d.y;
      if (ny < 0 || ny >= ROWS) continue;
      if (!isWalkable(grid, nx, ny, opts)) continue;
      const k = nx + ',' + ny;
      if (prev.has(k)) continue;
      prev.set(k, { from: x + ',' + y, dir: d });
      if (k === goal) {
        let node = prev.get(k);
        let cursor = k;
        while (node && node.from !== start) {
          cursor = node.from;
          node = prev.get(cursor);
        }
        return node ? node.dir : null;
      }
      queue.push([nx, ny]);
    }
  }
  return null;
}

export function createGame() {
  const state = {
    grid: buildGrid(),
    pellets: [],
    pelletsLeft: 0,
    equipment: [],
    player: null,
    users: [],
    score: 0,
    best: 0,
    lives: 3,
    level: 1,
    gains: 0,
    baseGains: 0,
    pump: 0,
    pumpMax: PUMP_SECONDS,
    pumpChain: 0,
    waveIndex: 0,
    waveTimer: 0,
    mode: 'scatter',
    status: 'title',
    statusTimer: 0,
    grace: 0,
    popups: [],
    events: [],
    lastEquipment: null,
    shake: 0,
  };
  resetLevel(state, 1);
  return state;
}

export function resetLevel(state, level) {
  state.level = level;
  state.baseGains = Math.min(3, level - 1);
  state.gains = state.baseGains;
  state.pump = 0;
  state.pumpChain = 0;
  state.waveIndex = 0;
  state.waveTimer = 0;
  state.mode = WAVES[0].mode;
  state.popups = [];

  const cells = pelletCells(state.grid);
  state.pellets = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  for (const c of cells) state.pellets[c.y][c.x] = true;
  state.pelletsLeft = cells.length;

  state.equipment = EQUIPMENT.map((e) => ({ ...e, taken: false }));
  state.lastEquipment = null;
  resetPositions(state);
}

export function resetPositions(state) {
  state.player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    dir: { ...DIRS.left },
    nextDir: null,
    speed: BASE_PLAYER_SPEED,
    mouth: 0,
    alive: true,
  };
  state.grace = 1.1;
  state.pump = 0;
  state.pumpChain = 0;

  const count = crowdSize(state.level);
  state.users = GYM_USERS.slice(0, count).map((def, i) => {
    const slot = PEN_SLOTS[i % PEN_SLOTS.length];
    const outside = i === 0;
    return {
      ...def,
      x: outside ? PEN_DOOR.x : slot.x,
      y: outside ? PEN_DOOR.y - 1 : slot.y,
      dir: outside ? { ...DIRS.left } : { ...DIRS.up },
      state: outside ? 'loose' : 'home',
      releaseTimer: i * 2.6,
      burst: 0,
      pause: 0,
      lazyTarget: { x: PLAYER_START.x, y: PLAYER_START.y },
      lazyTimer: 0,
      corner: SCATTER_CORNERS[i % SCATTER_CORNERS.length],
      wobble: Math.random() * Math.PI * 2,
    };
  });
}

export function isBeatable(state, user) {
  return state.pump > 0 || state.gains > user.strength;
}

function fleeing(state, user) {
  return state.pump > 0 && user.state === 'loose';
}

export function playerSpeed(state) {
  return BASE_PLAYER_SPEED + state.gains * 0.16 + (state.pump > 0 ? 0.7 : 0);
}

function userSpeed(state, user) {
  const levelBoost = 1 + (state.level - 1) * 0.055;
  let s = BASE_USER_SPEED * user.speed * levelBoost;
  if (user.state === 'humbled') return s * 2.1;
  if (user.state === 'exiting' || user.state === 'home') return s * 0.7;
  if (fleeing(state, user)) s *= 0.55;
  if (user.behaviour === 'burst') s *= user.burst > 0 ? 1.45 : 0.78;
  if (user.behaviour === 'filmer' && user.pause > 0) s = 0;
  // The one mercy: if you already out-lift them, they lose a little nerve.
  if (state.pump <= 0 && state.gains > user.strength) s *= 0.9;
  return s;
}

function pushPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color, life: 1.1 });
}

function emit(state, name, data) {
  state.events.push({ name, data });
}

function targetFor(state, user) {
  const p = state.player;
  if (user.state === 'humbled') return PEN_CENTER;
  if (user.state === 'exiting') return { x: PEN_DOOR.x, y: PEN_DOOR.y - 1 };
  if (state.mode === 'scatter' && state.pump <= 0) return user.corner;

  switch (user.behaviour) {
    case 'ambush':
      return { x: p.x + p.dir.x * 4, y: p.y + p.dir.y * 4 };
    case 'filmer': {
      // Circles to where you're headed rather than where you are.
      return { x: p.x + p.dir.x * 2 + p.dir.y * 3, y: p.y + p.dir.y * 2 + p.dir.x * 3 };
    }
    case 'lumber':
      return user.lazyTarget;
    case 'burst':
    case 'chase':
    default:
      return { x: p.x, y: p.y };
  }
}

function chooseDirection(state, user) {
  const cx = Math.round(user.x);
  const cy = Math.round(user.y);
  const throughDoor = user.state === 'humbled' || user.state === 'exiting';
  const opts = { throughDoor };

  if (user.state === 'humbled') {
    const step = bfsStep(state.grid, user, PEN_CENTER, opts);
    if (step) return step;
  }

  const options = [];
  for (const d of DIR_ORDER) {
    if (opposite(d, user.dir)) continue;
    if (!isWalkable(state.grid, cx + d.x, cy + d.y, opts)) continue;
    options.push(d);
  }
  if (!options.length) {
    const back = { x: -user.dir.x, y: -user.dir.y };
    return isWalkable(state.grid, cx + back.x, cy + back.y, opts) ? back : user.dir;
  }
  if (options.length === 1) return options[0];

  const flee = fleeing(state, user);
  const target = targetFor(state, user);
  let best = options[0];
  let bestScore = flee ? -Infinity : Infinity;
  for (const d of options) {
    const score = dist2(cx + d.x, cy + d.y, target.x, target.y);
    if (flee ? score > bestScore : score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function updateWave(state, dt) {
  if (state.pump > 0) return; // A pumped bro suspends the normal rhythm.
  const wave = WAVES[state.waveIndex];
  state.waveTimer += dt;
  if (state.waveTimer >= wave.time) {
    state.waveTimer = 0;
    state.waveIndex = Math.min(state.waveIndex + 1, WAVES.length - 1);
    const next = WAVES[state.waveIndex];
    if (next.mode !== state.mode) {
      state.mode = next.mode;
      // Mode flips make everyone turn on the spot — classic tell.
      for (const u of state.users) {
        if (u.state === 'loose') u.dir = { x: -u.dir.x, y: -u.dir.y };
      }
    }
  }
}

function collect(state) {
  const p = state.player;
  const cx = Math.round(p.x);
  const cy = Math.round(p.y);
  if (Math.abs(p.x - cx) > 0.45 || Math.abs(p.y - cy) > 0.45) return;

  if (state.pellets[cy] && state.pellets[cy][cx]) {
    state.pellets[cy][cx] = false;
    state.pelletsLeft--;
    state.score += SCORE.pellet;
    emit(state, 'chomp');
  }

  for (const eq of state.equipment) {
    if (eq.taken || eq.x !== cx || eq.y !== cy) continue;
    eq.taken = true;
    state.gains++;
    state.pump = Math.max(3, PUMP_SECONDS - (state.level - 1) * 0.5);
    state.pumpMax = state.pump;
    state.pumpChain = 0;
    state.score += SCORE.equipment;
    state.lastEquipment = eq;
    state.shake = 0.35;
    pushPopup(state, cx, cy, '+1 GAINS', '#ffe066');
    emit(state, 'powerup', eq);
  }

  if (state.pelletsLeft <= 0) {
    state.score += SCORE.levelClear;
    state.status = 'levelclear';
    state.statusTimer = 2.6;
    emit(state, 'levelclear');
  }
}

function resolveContact(state) {
  const p = state.player;
  for (const user of state.users) {
    if (user.state === 'humbled' || user.state === 'home') continue;
    let dx = Math.abs(user.x - p.x);
    if (dx > COLS / 2) dx = COLS - dx;
    const dy = Math.abs(user.y - p.y);
    if (dx > TOUCH_RANGE || dy > TOUCH_RANGE) continue;

    if (isBeatable(state, user)) {
      user.state = 'humbled';
      user.releaseTimer = 3;
      const gained = state.pump > 0
        ? SCORE.beatdown[Math.min(state.pumpChain, SCORE.beatdown.length - 1)]
        : SCORE.beatdown[0];
      if (state.pump > 0) state.pumpChain++;
      state.score += gained;
      state.shake = 0.3;
      pushPopup(state, user.x, user.y, '+' + gained, '#7ef2c9');
      emit(state, 'beatdown', user);
    } else if (state.grace <= 0) {
      state.status = 'dying';
      state.statusTimer = 1.7;
      state.player.alive = false;
      state.shake = 0.6;
      emit(state, 'death', user);
      return;
    }
  }
}

function updateUser(state, user, dt) {
  if (user.state === 'home') {
    user.releaseTimer -= dt;
    // Bobbing in place, waiting for a bench to free up.
    user.wobble += dt * 4;
    if (user.releaseTimer <= 0) {
      user.state = 'exiting';
      user.x = Math.round(user.x);
      user.dir = { ...DIRS.up };
    }
    return;
  }

  if (user.state === 'exiting') {
    // Walk to the door column, then straight out.
    const target = { x: PEN_DOOR.x, y: PEN_DOOR.y - 1 };
    if (Math.abs(user.x - target.x) > 0.02) {
      user.dir = user.x > target.x ? { ...DIRS.left } : { ...DIRS.right };
    } else {
      user.x = target.x;
      user.dir = { ...DIRS.up };
    }
    const step = userSpeed(state, user) * dt;
    user.y += user.dir.y * step;
    user.x += user.dir.x * step;
    if (user.dir.y < 0 && user.y <= target.y) {
      user.y = target.y;
      user.x = target.x;
      user.state = 'loose';
      user.dir = { ...DIRS.left };
    }
    return;
  }

  if (user.state === 'humbled') {
    const atPen = Math.abs(user.x - PEN_CENTER.x) < 0.3 && Math.abs(user.y - PEN_CENTER.y) < 0.3;
    if (atPen) {
      user.state = 'home';
      user.releaseTimer = 3.2;
      user.dir = { ...DIRS.up };
      return;
    }
  }

  if (user.behaviour === 'burst') {
    user.burst -= dt;
    if (user.burst < -1.4) user.burst = 1.1;
  }
  if (user.behaviour === 'filmer') {
    user.pause -= dt;
    if (user.pause < -4.5) user.pause = 1.2;
  }
  if (user.behaviour === 'lumber') {
    user.lazyTimer -= dt;
    if (user.lazyTimer <= 0) {
      user.lazyTimer = 0.9;
      user.lazyTarget = { x: state.player.x, y: state.player.y };
    }
  }

  const opts = { throughDoor: user.state === 'humbled' };
  advance(user, userSpeed(state, user) * dt, state.grid, opts, (e) => {
    e.dir = chooseDirection(state, e);
  });
}

export function update(state, dt) {
  state.events.length = 0;
  state.shake = Math.max(0, state.shake - dt * 2);

  for (let i = state.popups.length - 1; i >= 0; i--) {
    state.popups[i].life -= dt;
    state.popups[i].y -= dt * 0.9;
    if (state.popups[i].life <= 0) state.popups.splice(i, 1);
  }

  if (state.status === 'ready') {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) state.status = 'playing';
    return;
  }

  if (state.status === 'dying') {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) {
      state.lives--;
      if (state.lives <= 0) {
        state.status = 'gameover';
        state.best = Math.max(state.best, state.score);
        emit(state, 'gameover');
      } else {
        resetPositions(state);
        state.status = 'ready';
        state.statusTimer = 1.4;
      }
    }
    return;
  }

  if (state.status === 'levelclear') {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) {
      resetLevel(state, state.level + 1);
      state.status = 'ready';
      state.statusTimer = 1.8;
    }
    return;
  }

  if (state.status !== 'playing') return;

  state.grace = Math.max(0, state.grace - dt);
  if (state.pump > 0) {
    state.pump -= dt;
    if (state.pump <= 0) {
      state.pump = 0;
      state.pumpChain = 0;
      emit(state, 'pumpend');
    }
  }
  updateWave(state, dt);

  const p = state.player;
  p.speed = playerSpeed(state);
  advance(p, p.speed * dt, state.grid, {}, (e) => {
    if (e.nextDir && isWalkable(state.grid, Math.round(e.x) + e.nextDir.x, Math.round(e.y) + e.nextDir.y)) {
      e.dir = e.nextDir;
      e.nextDir = null;
    }
  });
  p.mouth += dt * 11;

  collect(state);
  if (state.status !== 'playing') return;

  for (const user of state.users) updateUser(state, user, dt);
  resolveContact(state);
}

/** Turn requests from the keyboard/touch. Reversals apply instantly, like Pac-Man. */
export function steer(state, dir) {
  const p = state.player;
  if (!p || state.status === 'gameover') return;
  if (opposite(dir, p.dir)) {
    p.dir = { ...dir };
    p.nextDir = null;
    return;
  }
  if (sameDir(dir, p.dir)) return;
  const cx = Math.round(p.x);
  const cy = Math.round(p.y);
  if (isCentered(p) && isWalkable(state.grid, cx + dir.x, cy + dir.y)) {
    p.dir = { ...dir };
    p.nextDir = null;
  } else {
    p.nextDir = { ...dir };
  }
}

export function startRun(state) {
  state.score = 0;
  state.lives = 3;
  state.status = 'ready';
  state.statusTimer = 1.8;
  resetLevel(state, 1);
  state.status = 'ready';
  state.statusTimer = 1.8;
}

export { FLOOR, COLS, ROWS };
