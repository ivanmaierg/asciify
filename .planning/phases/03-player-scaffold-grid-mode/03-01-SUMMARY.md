---
phase: 03-player-scaffold-grid-mode
plan: 01
subsystem: player
tags: [tsup, vitest, typescript, happy-dom, monorepo, player, pretext]

# Dependency graph
requires:
  - phase: 02-encoder-package
    provides: "@asciify/encoder types (AsciiPlayerData, AsciiPlayerDataCompact, AsciiFrame, etc.)"
provides:
  - "@asciify/player package shell with ESM+CJS+IIFE build via tsup"
  - "AsciiPlayerOptions, LoopMode, RenderMode, AsciiPlayerTheme, THEMES, PlayerInputData type contracts"
  - "vitest config with happy-dom environment ready for tests"
  - "tsup config inlining @chenglou/pretext and externalizing @asciify/encoder"
affects: [03-02, 03-03, 03-04, downstream player plans]

# Tech tracking
tech-stack:
  added: [tsup@8.5.1, vitest@4.1.2, happy-dom, "@chenglou/pretext"]
  patterns: [IIFE globalName Asciify for window.Asciify.AsciiPlayer access, encoder as peerDep+devDep pattern]

key-files:
  created:
    - packages/player/tsup.config.ts
    - packages/player/vitest.config.ts
    - packages/player/src/types.ts
  modified:
    - packages/player/package.json
    - packages/player/src/index.ts
    - pnpm-lock.yaml

key-decisions:
  - "globalName Asciify for IIFE build so users get window.Asciify.AsciiPlayer (avoids window.AsciiPlayer.AsciiPlayer collision)"
  - "@asciify/encoder added as both peerDependency (runtime) and devDependency (build-time type resolution)"
  - "noExternal: @chenglou/pretext bundles pretext into dist; external: @asciify/encoder keeps encoder as peer dep"

patterns-established:
  - "Player package uses workspace:* for internal encoder dep resolution in devDependencies"
  - "IIFE globalName follows package namespace (Asciify) not class name"

requirements-completed: [PLR-01, PLR-10]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 3 Plan 01: Player Package Scaffold and Type Contracts Summary

**@asciify/player package shell with ESM+CJS+IIFE build (tsup), vitest+happy-dom test config, and full TypeScript type contracts for AsciiPlayerOptions, LoopMode, THEMES, and PlayerInputData**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T18:45:26Z
- **Completed:** 2026-04-03T18:47:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Configured tsup build producing ESM + CJS + IIFE + .d.ts outputs with @chenglou/pretext inlined and @asciify/encoder kept external
- Created vitest config with happy-dom environment for browser-API tests
- Defined all player type contracts: AsciiPlayerOptions, LoopMode, RenderMode, AsciiPlayerTheme, THEMES, PlayerInputData
- Set up barrel export in src/index.ts with all public types and THEMES constant

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure package.json, tsup, and vitest** - `7326bd1` (chore)
2. **Task 2: Define player type contracts and barrel export** - `eedb47f` (feat)

**Plan metadata:** `(pending)`

## Files Created/Modified
- `packages/player/tsup.config.ts` - Build config: ESM+CJS+IIFE, inline pretext, extern encoder, globalName Asciify
- `packages/player/vitest.config.ts` - Test config with happy-dom environment
- `packages/player/src/types.ts` - All player type definitions and THEMES constant
- `packages/player/src/index.ts` - Barrel re-exports for all public types and THEMES
- `packages/player/package.json` - Updated with exports map, peerDependencies, scripts, all deps
- `pnpm-lock.yaml` - Updated with new player dependencies

## Decisions Made
- Used `globalName: 'Asciify'` for IIFE builds so users access `window.Asciify.AsciiPlayer` — avoids the `window.AsciiPlayer.AsciiPlayer` collision that would result from using the class name as global
- Added `@asciify/encoder` as both `peerDependencies` (runtime contract) and `devDependencies` (build-time type resolution for tsup DTS pass) — this is the canonical workspace peer dep pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @asciify/encoder as devDependency for DTS build resolution**
- **Found during:** Task 2 (Define player type contracts)
- **Issue:** tsup DTS build failed with TS2307 "Cannot find module '@asciify/encoder'" because peerDependencies are not installed automatically and pnpm couldn't fetch it from registry (not published yet)
- **Fix:** Added `"@asciify/encoder": "workspace:*"` to devDependencies so pnpm resolves it from the local workspace
- **Files modified:** packages/player/package.json, pnpm-lock.yaml
- **Verification:** `pnpm --filter @asciify/player build` exits 0 with DTS build success
- **Committed in:** eedb47f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — without it the DTS output is broken. No scope creep. The workspace:* pattern is the correct approach for local package dev before publishing.

## Issues Encountered
- `pnpm add --save-peer @asciify/encoder` failed with 404 because @asciify/encoder is not published to npm yet — resolved by manually editing package.json to add the workspace:* reference

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Package scaffold complete; all type contracts defined
- Plan 02 can implement AsciiPlayer class coding against AsciiPlayerOptions and PlayerInputData
- Plan 03 can implement AsciiPlayerElement (Web Component) using the same types
- vitest + happy-dom environment ready for browser-API tests in Plans 02-04

## Self-Check: PASSED

- FOUND: packages/player/tsup.config.ts
- FOUND: packages/player/vitest.config.ts
- FOUND: packages/player/src/types.ts
- FOUND: packages/player/dist/index.js
- FOUND: packages/player/dist/index.cjs
- FOUND: packages/player/dist/index.global.js
- FOUND: packages/player/dist/index.d.ts
- FOUND commit: 7326bd1 (Task 1)
- FOUND commit: eedb47f (Task 2)

---
*Phase: 03-player-scaffold-grid-mode*
*Completed: 2026-04-03*
