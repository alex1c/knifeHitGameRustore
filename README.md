# Меткий нож

Android arcade precision game for RuStore (`com.calculatorplatform.precisionthrow`).

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript (strict)
- React Native Skia
- React Navigation
- AsyncStorage (progression + settings + modes/stats)
- expo-audio / expo-haptics (game feel)
- AppMetrica (`@appmetrica/react-native-analytics`)
- Yandex Mobile Ads (`yandex-mobile-ads`)
- Jest + ESLint

## Modes

- **Campaign** — 30 levels, local unlock progression, milestone themes.
- **Endless** — one-hit-ends-run scoring with waves; local best score.
- **Daily Challenge** — deterministic challenge from local `YYYY-MM-DD` (offline).
- **Statistics / streak** — local counters.

## Monetization / analytics (Phase 6)

- **AppMetrica** — semantic events via adapter (offline-safe).
- **Yandex Ads** — banners on Home / Levels / Statistics only; no ads during active gameplay.
- Interstitial: ForestMusic gates (5 min, 5 meaningful actions, max 1/session).
- Rewarded: optional Campaign second chance only.
- App Open: infrastructure wired; real shows disabled for 1.0.
- Native ad unit reserved; placement deferred.

## Master icon

Source of truth: `assets/icon_gpt.png` (do not edit).

Derived launcher / adaptive assets are generated from that master:
- `assets/icon.png`
- `assets/android-icon-foreground.png` (padded for adaptive safe zone)
- `assets/android-icon-background.png`
- `assets/favicon.png`

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

Native modules (AppMetrica / Yandex Ads) require a development / prebuild Android binary.

## Quality checks

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
```

## Architecture notes

- Authoritative timing: rendering and collision share the compiled timeline.
- Shared engine across Campaign / Endless / Daily.
- Ads and analytics are isolated behind adapters (mocked in Jest).
- No economy, shop, purchases, online leaderboards, or server accounts in current phases.
