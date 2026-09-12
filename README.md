# Точный бросок (Precision Throw)

Android arcade precision game for RuStore.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript (strict)
- React Native Skia
- React Navigation
- AsyncStorage (progression + settings)
- expo-av / expo-haptics (game feel)
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

- **30 campaign levels** with deterministic looping rotation timelines.
- **Authoritative timing:** rendering and collision sample the same compiled timeline.
- **Progression:** local unlock/completed storage.
- **Game feel:** presentation events → short SFX, haptics, Skia particles (no rule changes).
- **Visual identity:** own spike/pin/dart projectiles and range/aurora/ember targets.
  Extra styles unlock at milestones 10 / 20 (no shop/economy).
- **Validation:** `validateLevelCollection(PRODUCTION_LEVELS)`.
- **Dev QA (`__DEV__` only):** unlock-all / reset on Levels.

Background AppState freezes round elapsed; audio stops while inactive.
