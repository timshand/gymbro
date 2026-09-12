// The other gym users. `strength` is the GAINS level you must exceed before
// you can throw hands instead of running.

export const GYM_USERS = [
  {
    id: 'bunny',
    name: 'Cardio Bunny',
    short: 'CARDIO',
    color: '#ff6bd6',
    strength: 1,
    speed: 1.06,
    behaviour: 'ambush',
    blurb: 'Fast. Never looks up from the treadmill.',
  },
  {
    id: 'influencer',
    name: 'The Influencer',
    short: 'FILMER',
    color: '#7ef2c9',
    strength: 2,
    speed: 0.98,
    behaviour: 'filmer',
    blurb: 'Stops to film, then sprints to your rack.',
  },
  {
    id: 'rat',
    name: 'Gym Rat',
    short: 'GYM RAT',
    color: '#ff5252',
    strength: 3,
    speed: 1.0,
    behaviour: 'chase',
    blurb: 'Comes straight at you. Every time.',
  },
  {
    id: 'crossfit',
    name: 'CrossFitter',
    short: 'CROSSFIT',
    color: '#ffb44d',
    strength: 4,
    speed: 1.02,
    behaviour: 'burst',
    blurb: 'AMRAP. Moves in violent bursts.',
  },
  {
    id: 'powerlifter',
    name: 'Powerlifter',
    short: 'POWER',
    color: '#9d7bff',
    strength: 6,
    speed: 0.82,
    behaviour: 'lumber',
    blurb: 'Slow. Enormous. Will end you until you are maxed.',
  },
];

/** Scatter/chase rhythm, in seconds. Later levels spend more time hunting. */
export const WAVES = [
  { mode: 'scatter', time: 6 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 5 },
  { mode: 'chase', time: 20 },
  { mode: 'scatter', time: 4 },
  { mode: 'chase', time: 25 },
  { mode: 'scatter', time: 4 },
  { mode: 'chase', time: Infinity },
];

export const PUMP_SECONDS = 7;
export const BASE_PLAYER_SPEED = 5.6; // tiles per second
export const BASE_USER_SPEED = 4.9;

export const SCORE = {
  pellet: 10,
  equipment: 100,
  beatdown: [200, 400, 800, 1600, 3200],
  levelClear: 1000,
};
