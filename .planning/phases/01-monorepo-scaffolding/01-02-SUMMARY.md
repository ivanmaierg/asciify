---
phase: 01-monorepo-scaffolding
plan: 02
subsystem: infra
tags: [pnpm, monorepo, workspace, typescript, encoder, player]

# Dependency graph
requires:
  - phase: 01-monorepo-scaffolding plan 01
    provides: root package.json with packageManager field, pnpm-workspace.yaml, tsconfig.base.json
provides:
  - pnpm-lock.yaml replacing package-lock.json
  - packages/encoder/ workspace package shell (@asciify/encoder@0.1.0)
  - packages/player/ workspace package shell (@asciify/player@0.1.0)
  - 3-package pnpm workspace (asciify-monorepo, @asciify/encoder, @asciify/player)
affects: [02-encoder-extraction, 03-player-package, 04-player-modes, apps/web migration]

# Tech tracking
tech-stack:
  added: [pnpm 10.33.0 via corepack]
  patterns: [workspace package shell with package.json + tsconfig.json + src/index.ts stub]

key-files:
  created:
    - pnpm-lock.yaml
    - packages/encoder/package.json
    - packages/encoder/tsconfig.json
    - packages/encoder/src/index.ts
    - packages/player/package.json
    - packages/player/tsconfig.json
    - packages/player/src/index.ts
  modified:
    - pnpm-lock.yaml (updated after workspace packages registered)

key-decisions:
  - "pnpm 10.33.0 activated via corepack (not global npm install) to respect packageManager field"
  - "Package shells are private:false so they can be published; root stays private:true"
  - "src/index.ts stubs use export {} to satisfy TypeScript module requirements"

patterns-established:
  - "Pattern: workspace package shell = package.json + tsconfig.json extending ../../tsconfig.base.json + src/index.ts with export {}"
  - "Pattern: scoped path alias per package (@encoder/* for encoder, @player/* for player)"

requirements-completed: [MONO-01, MONO-05]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 01 Plan 02: npm to pnpm Migration + Package Shells Summary

**pnpm 10.33.0 workspace established with pnpm-lock.yaml replacing package-lock.json, and two stub packages @asciify/encoder and @asciify/player registered as workspace members**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-02T17:13:14Z
- **Completed:** 2026-04-02T17:17:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Deleted npm artifacts (node_modules, package-lock.json, tsconfig.tsbuildinfo) and ran clean pnpm install generating pnpm-lock.yaml
- Created packages/encoder/ shell: @asciify/encoder@0.1.0 with package.json, tsconfig.json (extends tsconfig.base.json), and src/index.ts stub
- Created packages/player/ shell: @asciify/player@0.1.0 with same structure
- pnpm workspace now reports 3 projects: asciify-monorepo, @asciify/encoder, @asciify/player

## Task Commits

Each task was committed atomically:

1. **Task 1: npm to pnpm clean-slate migration** - `010242b` (chore)
2. **Task 2: Create encoder and player package shells** - `80398a2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `pnpm-lock.yaml` - pnpm workspace lockfile (lockfileVersion 9.0)
- `package-lock.json` - Deleted (replaced by pnpm-lock.yaml)
- `packages/encoder/package.json` - @asciify/encoder@0.1.0 manifest, type:module, private:false
- `packages/encoder/tsconfig.json` - Extends ../../tsconfig.base.json, @encoder/* path alias
- `packages/encoder/src/index.ts` - Phase 1 stub with export {}
- `packages/player/package.json` - @asciify/player@0.1.0 manifest, type:module, private:false
- `packages/player/tsconfig.json` - Extends ../../tsconfig.base.json, @player/* path alias
- `packages/player/src/index.ts` - Phase 1 stub with export {}

## Decisions Made
- Used `corepack prepare pnpm@10.33.0 --activate` to match packageManager field in root package.json
- Package shells set `private: false` since they will be published to npm
- Both tsconfigs include scoped path aliases (@encoder/*, @player/*) per D-06 from CONTEXT.md
- No tsup configured yet — build tooling added in Phase 2/3 when implementation begins

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `packages/encoder/src/index.ts` - Empty export stub; real encoder implementation in Phase 2
- `packages/player/src/index.ts` - Empty export stub; real player implementation in Phase 3

These stubs are intentional for this plan's goal (establishing workspace structure). Phase 2 will implement encoder, Phase 3 will implement player.

## Next Phase Readiness
- pnpm workspace with 3 packages is ready for Phase 01-03 (apps/web migration)
- packages/encoder and packages/player are registered workspace members, ready to receive dependencies in Phase 2 and 3
- No blockers

---
*Phase: 01-monorepo-scaffolding*
*Completed: 2026-04-02*
