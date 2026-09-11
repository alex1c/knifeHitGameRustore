# Точный бросок (Precision Throw)

Android arcade precision game for RuStore.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript (strict)
- React Native Skia
- React Navigation
- AsyncStorage (local progression)
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

- **30 campaign levels** with deterministic looping rotation timelines
  (constant, speed ramps, pauses, reversals).
- **Authoritative timing:** `targetRotationAtElapsed(level, elapsedMs)` —
  rendering and collision sample the same compiled timeline.
  Impact elapsed is fixed at throw start (`throwStart + flightMs`).
- **Progression:** local versioned storage (`highestUnlockedLevel`, completed ids).
  Fresh install unlocks Level 1 only.
- **Validation:** `validateLevelCollection(PRODUCTION_LEVELS)` guards configs.
- **Dev QA (`__DEV__` only):** unlock-all / reset on Levels screen.

`src/game/engine` = rules + timeline. `GameCanvas` = Skia presentation.
Background AppState freezes round elapsed so the target does not spin while away.
