// Tiny WebAudio bleeper — no asset files, no loading.

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : 0.22;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'square', vol = 1, slideTo = null) {
  const c = ensure();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

let chompFlip = false;

export const sfx = {
  chomp() {
    chompFlip = !chompFlip;
    tone(chompFlip ? 210 : 160, 0.055, 'square', 0.5);
  },
  powerup() {
    tone(220, 0.1, 'sawtooth', 0.7, 660);
    setTimeout(() => tone(440, 0.18, 'sawtooth', 0.6, 880), 90);
  },
  beatdown() {
    tone(520, 0.09, 'square', 0.8, 120);
    setTimeout(() => tone(180, 0.14, 'triangle', 0.7, 60), 70);
  },
  death() {
    tone(420, 0.5, 'sawtooth', 0.8, 70);
    setTimeout(() => tone(200, 0.5, 'square', 0.6, 50), 180);
  },
  levelclear() {
    [0, 110, 220, 330].forEach((d, i) => setTimeout(() => tone(330 + i * 165, 0.16, 'square', 0.6), d));
  },
  gameover() {
    [0, 200, 400].forEach((d, i) => setTimeout(() => tone(300 - i * 70, 0.4, 'sawtooth', 0.7, 60), d));
  },
  start() {
    [0, 90, 180, 300].forEach((d, i) => setTimeout(() => tone([262, 330, 392, 523][i], 0.14, 'square', 0.6), d));
  },
};
