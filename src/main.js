import './style.css';
import { createGame, update, steer, startRun, DIRS, isBeatable } from './game.js';
import { bakeMaze, render, TILE, WIDTH, HEIGHT } from './render.js';
import { EQUIPMENT } from './maze.js';
import { GYM_USERS } from './characters.js';
import { sfx, unlock, setMuted, isMuted } from './audio.js';

const MAX_GAINS = EQUIPMENT.length + 3;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const panel = overlay.querySelector('.panel');
const startBtn = document.getElementById('startBtn');
const muteBtn = document.getElementById('muteBtn');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const meterEl = document.getElementById('gainsMeter');
const threatsEl = document.getElementById('threats');
const pumpBar = document.getElementById('pumpBar');
const pumpFill = document.getElementById('pumpFill');
const pumpText = document.getElementById('pumpText');

const state = createGame();
const maze = bakeMaze(state.grid);

if (import.meta.env.DEV) window.__gym = state;

/* ---------- canvas sizing ---------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.style.aspectRatio = `${WIDTH} / ${HEIGHT}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

/* ---------- static UI ---------- */
meterEl.innerHTML = Array.from({ length: MAX_GAINS }, () => '<i></i>').join('');
const meterCells = [...meterEl.querySelectorAll('i')];

document.getElementById('roster').innerHTML = GYM_USERS.map((u) => `
  <div class="roster-row">
    <span class="roster-dot" style="background:${u.color}"></span>
    <span class="roster-name">${u.name}</span>
    <span class="roster-blurb">${u.blurb}</span>
    <span class="roster-str">${'<i></i>'.repeat(u.strength)}</span>
  </div>`).join('');

/* ---------- input ---------- */
const KEYS = {
  ArrowUp: DIRS.up, ArrowDown: DIRS.down, ArrowLeft: DIRS.left, ArrowRight: DIRS.right,
  w: DIRS.up, s: DIRS.down, a: DIRS.left, d: DIRS.right,
  W: DIRS.up, S: DIRS.down, A: DIRS.left, D: DIRS.right,
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (state.status === 'title' || state.status === 'gameover') {
      e.preventDefault();
      begin();
    }
    return;
  }
  const dir = KEYS[e.key];
  if (!dir) return;
  e.preventDefault();
  unlock();
  steer(state, dir);
}, { passive: false });

document.getElementById('pad').addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('button[data-dir]');
  if (!btn) return;
  e.preventDefault();
  unlock();
  steer(state, DIRS[btn.dataset.dir]);
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (!touchStart) return;
  const dx = e.touches[0].clientX - touchStart.x;
  const dy = e.touches[0].clientY - touchStart.y;
  if (Math.hypot(dx, dy) < 24) return;
  steer(state, Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? DIRS.right : DIRS.left)
    : (dy > 0 ? DIRS.down : DIRS.up));
  touchStart = null;
}, { passive: true });

muteBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? 'SOUND OFF' : 'SOUND ON';
});

startBtn.addEventListener('click', begin);

function begin() {
  unlock();
  sfx.start();
  startRun(state);
  overlay.hidden = true;
}

/* ---------- game-over screen ---------- */
function showGameOver() {
  const cleared = state.level - 1;
  panel.innerHTML = `
    <h1>YOU GOT<span> BEATEN UP</span></h1>
    <p class="tag">
      You made it to round ${state.level} with ${state.gains} gains.<br>
      ${cleared > 0 ? `${cleared} floor${cleared > 1 ? 's' : ''} cleared.` : 'Not one floor cleared. Brutal.'}
    </p>
    <div class="rules" style="text-align:center">
      <div style="font-size:9px;letter-spacing:.2em;color:var(--dim)">FINAL SCORE</div>
      <div style="font-size:30px;color:var(--accent);font-weight:700">${state.score.toLocaleString()}</div>
      ${state.best > state.score ? `<div style="font-size:9px;color:var(--dim)">BEST ${state.best.toLocaleString()}</div>` : ''}
    </div>
    <button id="startBtn" class="start" type="button">RUN IT BACK</button>`;
  panel.querySelector('#startBtn').addEventListener('click', begin);
  overlay.hidden = false;
}

/* ---------- HUD ---------- */
let lastScore = -1;
let lastGains = -1;
let lastLives = -1;
let lastLevel = -1;
let lastThreatKey = '';

function syncHud() {
  if (state.score !== lastScore) {
    scoreEl.textContent = state.score.toLocaleString();
    lastScore = state.score;
  }
  if (state.level !== lastLevel) {
    levelEl.textContent = state.level;
    lastLevel = state.level;
  }
  if (state.lives !== lastLives) {
    livesEl.textContent = '●'.repeat(Math.max(0, state.lives));
    lastLives = state.lives;
  }
  if (state.gains !== lastGains) {
    meterCells.forEach((cell, i) => cell.classList.toggle('on', i < state.gains));
    lastGains = state.gains;
  }

  const pumped = state.pump > 0;
  pumpBar.classList.toggle('active', pumped);
  pumpFill.style.width = pumped
    ? `${Math.min(100, (state.pump / (state.pumpMax || 7)) * 100)}%`
    : '0%';
  const wanted = pumped ? 'PUMPED — GO GET THEM' : 'REACH EQUIPMENT TO GET PUMPED';
  if (pumpText.textContent !== wanted) pumpText.textContent = wanted;

  const key = state.users.map((u) => u.id + (isBeatable(state, u) ? '1' : '0')).join();
  if (key !== lastThreatKey) {
    threatsEl.innerHTML = state.users.map((u) => {
      const beat = isBeatable(state, u);
      return `<div class="threat${beat ? ' beatable' : ''}">
        <span class="dot" style="background:${u.color}"></span>
        <span>${u.short}</span>
        <span class="verdict">${beat ? 'FIGHT' : 'AVOID'}</span>
      </div>`;
    }).join('');
    lastThreatKey = key;
  }
}

/* ---------- loop ---------- */
const SOUNDS = {
  chomp: sfx.chomp,
  powerup: sfx.powerup,
  beatdown: sfx.beatdown,
  death: sfx.death,
  levelclear: sfx.levelclear,
  gameover: sfx.gameover,
};

let last = performance.now();
let elapsed = 0;

function frame(now) {
  // Clamp so a backgrounded tab doesn't teleport anyone through a wall.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;

  if (state.status !== 'title') update(state, dt);

  for (const ev of state.events) {
    const play = SOUNDS[ev.name];
    if (play) play();
    if (ev.name === 'gameover') showGameOver();
  }

  render(ctx, state, maze, elapsed);
  syncHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
