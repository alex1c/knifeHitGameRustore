# Точный бросок (Precision Throw)

Android arcade precision game for RuStore.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript (strict)
- React Native Skia
- React Navigation
- AsyncStorage (progression + settings + modes/stats)
- expo-audio / expo-haptics (game feel)
- Jest + ESLint

## Setup

```bash
npm install
```

## Run

```bash
npm start
# or
npm run android
```

## Quality checks

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
```

## Modes

- **Campaign** — 30 levels, local unlock progression, milestone themes.
- **Endless** — one-hit-ends-run scoring with waves; local best score.
- **Daily Challenge** — deterministic challenge from local `YYYY-MM-DD` date key (offline, no server).
- **Statistics / streak** — local counters; daily streak from consecutive calendar completions.

## Architecture

- **Authoritative timing:** rendering and collision sample the same compiled timeline.
- **Shared engine:** Campaign / Endless / Daily reuse throw, collision, and timeline core.
- **Progression + settings + modes:** versioned AsyncStorage schemas with sanitize fallbacks.
- **Game feel:** presentation events → short SFX, haptics, Skia particles (no rule changes).
- **Visual identity:** own spike/pin/dart projectiles and range/aurora/ember targets.
  Extra styles unlock at milestones 10 / 20 (no shop/economy).
- **Validation:** `validateLevelCollection(PRODUCTION_LEVELS)` plus generated endless/daily configs.
- **Dev QA (`__DEV__` only):** unlock-all / reset; endless band jump; daily date override / streak QA.

Background AppState freezes round elapsed; audio stops while inactive.
No ads, economy, accounts, or online leaderboards in current phases.
