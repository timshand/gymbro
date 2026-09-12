// The gym floor. Equipment islands separated by walkways, Pac-Man style.

export const COLS = 21;
export const ROWS = 21;

export const WALL = 0;
export const FLOOR = 1;
export const DOOR = 2;

// Walls sit where a "rack row" crosses a "rack column" — that's what makes it
// read like a gym floor plan instead of a hedge maze.
const BLOCK_COLS = new Set([2, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18]);
const BLOCK_ROWS = new Set([2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18]);

// Passages punched through solid racks so the floor isn't a perfect grid.
const CARVED = [
  [2, 6], [3, 6], [4, 6], [16, 6], [17, 6], [18, 6],
  [6, 14], [7, 14], [8, 14], [12, 14], [13, 14], [14, 14],
  [3, 9], [3, 10], [3, 11], [17, 9], [17, 10], [17, 11],
  [7, 2], [7, 3], [13, 2], [13, 3],
  [7, 17], [7, 18], [13, 17], [13, 18],
];

// The staff room the other gym users spawn out of.
const PEN_WALLS = [
  [8, 9], [9, 9], [11, 9], [12, 9],
  [8, 10], [12, 10],
  [8, 11], [9, 11], [10, 11], [11, 11], [12, 11],
];
const PEN_FLOOR = [[9, 10], [10, 10], [11, 10]];
export const PEN_DOOR = { x: 10, y: 9 };
export const PEN_CENTER = { x: 10, y: 10 };
export const PEN_SLOTS = [
  { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 11, y: 10 },
  { x: 9.5, y: 10 }, { x: 10.5, y: 10 },
];

// Rows that wrap around the edges of the floor.
export const TUNNEL_ROWS = [8, 12];

export const PLAYER_START = { x: 10, y: 16 };

// Every piece of equipment you can reach. Reaching one is a permanent level-up.
export const EQUIPMENT = [
  { x: 1, y: 1, kind: 'dumbbell', name: 'Dumbbells' },
  { x: 10, y: 1, kind: 'barbell', name: 'Barbell' },
  { x: 19, y: 1, kind: 'kettlebell', name: 'Kettlebell' },
  { x: 1, y: 10, kind: 'bench', name: 'Bench Press' },
  { x: 19, y: 10, kind: 'rack', name: 'Squat Rack' },
  { x: 1, y: 19, kind: 'treadmill', name: 'Treadmill' },
  { x: 10, y: 19, kind: 'rower', name: 'Rowing Machine' },
  { x: 19, y: 19, kind: 'cable', name: 'Cable Machine' },
];

export const SCATTER_CORNERS = [
  { x: 1, y: 1 }, { x: 19, y: 1 }, { x: 1, y: 19 }, { x: 19, y: 19 }, { x: 10, y: 1 },
];

function key(x, y) {
  return x + ',' + y;
}

/** Builds the static tile grid. Same floor every level — the crowd is what changes. */
export function buildGrid() {
  const carved = new Set(CARVED.map(([x, y]) => key(x, y)));
  const penWalls = new Set(PEN_WALLS.map(([x, y]) => key(x, y)));
  const penFloor = new Set(PEN_FLOOR.map(([x, y]) => key(x, y)));
  const tunnels = new Set(TUNNEL_ROWS);

  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      row.push(tileAt(x, y));
    }
    grid.push(row);
  }
  return grid;

  function tileAt(x, y) {
    if (x === PEN_DOOR.x && y === PEN_DOOR.y) return DOOR;
    if (penFloor.has(key(x, y))) return FLOOR;
    if (penWalls.has(key(x, y))) return WALL;

    const onEdge = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
    if (onEdge) return tunnels.has(y) && (x === 0 || x === COLS - 1) ? FLOOR : WALL;

    if (carved.has(key(x, y))) return FLOOR;
    return BLOCK_COLS.has(x) && BLOCK_ROWS.has(y) ? WALL : FLOOR;
  }
}

/** Horizontal wrap so the tunnel rows connect both ends of the gym. */
export function wrapX(x) {
  if (x < 0) return x + COLS;
  if (x >= COLS) return x - COLS;
  return x;
}

export function tileAtGrid(grid, x, y) {
  const wx = wrapX(x);
  if (y < 0 || y >= ROWS) return WALL;
  return grid[y][wx];
}

/** Walls block everyone; the pen door only opens for gym users. */
export function isWalkable(grid, x, y, opts = {}) {
  const t = tileAtGrid(grid, x, y);
  if (t === FLOOR) return true;
  if (t === DOOR) return !!opts.throughDoor;
  return false;
}

export function inPen(x, y) {
  return x >= 8.5 && x <= 11.5 && y >= 9.5 && y <= 10.5;
}

/** Floor cells that get a protein-shake pickup — everything but the pen and tunnels. */
export function pelletCells(grid) {
  const cells = [];
  const equip = new Set(EQUIPMENT.map((e) => key(e.x, e.y)));
  const tunnels = new Set(TUNNEL_ROWS);
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y][x] !== FLOOR) continue;
      if (equip.has(key(x, y))) continue;
      if (inPen(x, y)) continue;
      if (tunnels.has(y) && (x <= 1 || x >= COLS - 2)) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}
