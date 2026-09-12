# GYM BRO

A Pac-Man-like arcade game about surviving peak hour at the gym.

You're on a crowded gym floor. The regulars are pacing between machines and none of
them are looking where they're going. Touch one who's stronger than you and they'll
beat you up. Reach a piece of equipment and you get permanently stronger — strong
enough, eventually, to stop running and start swinging.

Built with Vite. No frameworks, no sprite assets — the whole gym is drawn on a canvas
at runtime.

## Play

```bash
npm install
npm run dev
```

Then open http://localhost:5180.

## How it works

**Movement.** Arrow keys, WASD, swipe, or the on-screen d-pad. Tunnels on rows 8 and
12 wrap around the sides of the floor.

**Gains.** Each of the 8 pieces of equipment can be reached once per round. Reaching
one permanently raises your **GAINS** level and triggers a short **PUMP**.

**The combat rule.** Every gym user has a strength, shown as pips above their head:

| Gym user | Strength | Behaviour |
| --- | --- | --- |
| Cardio Bunny | 1 | Fast, aims where you're *going* |
| The Influencer | 2 | Stops to film, then cuts you off |
| Gym Rat | 3 | Comes straight at you |
| CrossFitter | 4 | Moves in violent bursts |
| Powerlifter | 6 | Slow, enormous, nearly unbeatable |

Your GAINS must *exceed* their strength before you can fight them. Pips turn green
and the threat board under the floor flips from `AVOID` to `FIGHT` the moment it's
safe. While PUMPED, everyone is beatable and they scatter — chain beatdowns for
200 → 400 → 800 → 1600 → 3200.

Out-ranking someone without a pump doesn't make them flee. They keep coming; you
just win when you collide.

**Rounds.** Clear every protein pickup to finish the floor. Each round adds another
gym user (up to five), speeds everyone up, shortens the pump — and lets you keep a
little of your strength, up to a base of 3 gains.

## Layout

| File | Role |
| --- | --- |
| `src/maze.js` | Floor plan, tunnels, equipment and pickup placement |
| `src/characters.js` | Gym user roster, strengths, scoring, wave timings |
| `src/game.js` | Movement, AI targeting, combat, round flow |
| `src/render.js` | Canvas drawing — maze baking, sprites, banners |
| `src/audio.js` | WebAudio bleeps, generated on the fly |
| `src/main.js` | Input, HUD, overlays, game loop |

## Deploying to Vercel

The repo is a stock Vite app and `vercel.json` pins the framework preset, so it
deploys as-is:

```bash
npx vercel
```

Or point Vercel at the repo — it builds with `npm run build` and serves `dist`.
