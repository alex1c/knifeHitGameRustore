# Меткий нож / ForestMusic notes

Read Expo SDK 57 docs before native or config changes:
https://docs.expo.dev/versions/v57.0.0/

## Hard rules

- GitHub is source of truth.
- No secrets, production keystores, or signing passwords in the repo.
- No RuStore upload / release AAB in foundation phases.
- Keep game rules / collision math free of Skia and React UI.
- Do not drive gameplay-critical state with per-frame React setState.
- Ads during active gameplay are forbidden.
