# Точный бросок (Precision Throw)

Android arcade precision game for RuStore.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript (strict)
- React Native Skia
- React Navigation
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

## Architecture

- `src/game/math` — pure angle helpers for future collisions (no UI).
- `src/game/engine` — deterministic state helpers driven by elapsed time.
- `src/game/models` + `src/game/config` — domain types and prototype levels.
- `src/components/GameCanvas.tsx` — Skia presentation only; animation uses Reanimated shared values, not per-frame React state.
- `src/screens` + `src/navigation` — Home, Game, Levels, Learning, Settings.

Gameplay throw/collision loop arrives in Phase 2. Ads, signing, and RuStore upload are out of scope for foundation.
