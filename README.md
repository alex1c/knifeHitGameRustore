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

Core gameplay (Phase 2) is playable: tap → flight → impact → attach or loss → win / instant retry.

**Authoritative timing:** target rotation is `targetAngleAtElapsed(level, elapsedMs)`.
Rendering and collision both use that formula. Impact angle is fixed at throw start
as `throwStartElapsedMs + FLIGHT_DURATION_MS` (not a late animation clock read).

**Separation:**

- `src/game/math` — angle helpers and world↔local transforms (no UI)
- `src/game/engine` — throw / impact / win / loss state transitions
- `src/components/GameCanvas.tsx` — Skia presentation; Reanimated shared values for rotation/flight (no React state per frame)
- `src/hooks/useGameController.ts` — semantic React updates only

Ads, economy, bosses, signing, and RuStore upload are out of scope.
