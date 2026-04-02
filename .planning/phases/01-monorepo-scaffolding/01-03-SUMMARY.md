---
phase: 01-monorepo-scaffolding
plan: 03
subsystem: infra
tags: [nextjs, monorepo, apps/web, tsconfig, pnpm, migration]

# Dependency graph
requires:
  - phase: 01-monorepo-scaffolding plan 01
    provides: root package.json, pnpm-workspace.yaml, tsconfig.base.json
  - phase: 01-monorepo-scaffolding plan 02
    provides: pnpm-lock.yaml, packages/encoder, packages/player workspace shells
provides:
  - apps/web/ complete Next.js app in monorepo position
  - apps/web/tsconfig.json extending ../../tsconfig.base.json
  - apps/web/package.json with name "web" and all app dependencies
  - 4-package pnpm workspace (root + web + encoder + player)
affects: [02-encoder-extraction, 03-player-package, 04-player-modes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - apps/web/tsconfig.json extends ../../tsconfig.base.json and overrides target=ES2017, allowJs, jsx, incremental
    - "@/*": ["./src/*"] path alias relative to apps/web/ per Pitfall 2

key-files:
  created:
    - apps/web/package.json
    - apps/web/tsconfig.json
  modified:
    - .gitignore (added apps/web/.next/, apps/web/out/, apps/web/next-env.d.ts, node_modules/ patterns)
    - pnpm-lock.yaml (updated for 4-package workspace)
  moved-to-apps/web:
    - src/ -> apps/web/src/
    - public/ -> apps/web/public/
    - next.config.ts -> apps/web/next.config.ts
    - eslint.config.mjs -> apps/web/eslint.config.mjs
    - postcss.config.mjs -> apps/web/postcss.config.mjs
    - components.json -> apps/web/components.json
  deleted:
    - tsconfig.json (superseded by tsconfig.base.json + apps/web/tsconfig.json)

key-decisions:
  - "apps/web/tsconfig.json extends ../../tsconfig.base.json with minimal overrides for Next.js compatibility"
  - "@/* path alias uses ./src/* (relative to apps/web/) not ../../src/* — critical per Pitfall 2"
  - ".gitignore updated to cover apps/web/.next/ and node_modules/ in subdirectories"

patterns-established:
  - "Next.js app tsconfig Pattern 2: extends base, overrides target+jsx+incremental+allowJs, paths relative to app dir"

requirements-completed: [MONO-01, MONO-03, MONO-04]

# Metrics
duration: ~8min
completed: 2026-04-02
---

# Phase 01 Plan 03: Move App to apps/web/ Summary

**All Next.js app files moved from repo root to apps/web/ with app-specific tsconfig.json and package.json; pnpm workspace now has 4 members; typecheck and build both pass**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-02T16:57:47Z
- **Completed:** 2026-04-02T18:50:29Z (all tasks complete, including Task 3 human-verify approved)
- **Tasks:** 3/3 complete
- **Files modified:** 58+

## Accomplishments

- Moved all app source and config files from repo root into `apps/web/` preserving git history (git detects renames)
- Created `apps/web/package.json` with name "web" and exact original app dependencies
- Created `apps/web/tsconfig.json` extending `../../tsconfig.base.json` with Next.js-specific overrides
- Deleted root `tsconfig.json` (superseded by base + app-level config)
- Ran `pnpm install` — workspace now reports 4 packages: asciify-monorepo, web, @asciify/encoder, @asciify/player
- `pnpm --filter web typecheck` passes with 0 TypeScript errors
- `pnpm --filter web build` succeeds and produces `apps/web/.next/`
- Updated `.gitignore` to cover `apps/web/.next/`, `apps/web/next-env.d.ts`, and `node_modules/` in subdirectories

## Task Commits

Each task was committed atomically:

1. **Task 1: Move app files to apps/web/ and create package.json + tsconfig.json** - `4d4ee93` (feat)
2. **Task 2: Verify typecheck and build pass + fix .gitignore** - `b9b6e36` (chore)
3. **Task 3: Verify app runs from apps/web/ (human-verify)** - `1274d0c` (checkpoint, approved)

**Plan metadata:** `1274d0c` (docs: complete plan — checkpoint commit)

## Files Created/Modified

- `apps/web/package.json` - Created: "web" package with all app dependencies
- `apps/web/tsconfig.json` - Created: extends ../../tsconfig.base.json, @/* alias
- `apps/web/src/` - Moved from root src/
- `apps/web/public/` - Moved from root public/
- `apps/web/next.config.ts` - Moved from root
- `apps/web/eslint.config.mjs` - Moved from root
- `apps/web/postcss.config.mjs` - Moved from root
- `apps/web/components.json` - Moved from root
- `tsconfig.json` - Deleted (superseded)
- `.gitignore` - Updated for monorepo paths
- `pnpm-lock.yaml` - Updated for 4-package workspace

## Decisions Made

- Used `extends: "../../tsconfig.base.json"` with minimal overrides: target=ES2017 (Next.js compat), noEmit, allowJs, jsx=react-jsx, incremental, next plugin, @/* paths
- `"@/*": ["./src/*"]` is relative to `apps/web/` directory — CRITICAL: ensures @/lib/... resolves correctly from new location
- `.gitignore` updated with `apps/web/.next/` pattern (original `/.next/` was root-anchored and no longer matched)
- Root `tsconfig.json` deleted: the base handles shared settings, apps/web handles Next.js-specific settings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Updated .gitignore for moved app paths**
- **Found during:** Task 2
- **Issue:** After moving app to apps/web/, the `.gitignore` patterns `/.next/` and `next-env.d.ts` were root-anchored and no longer matched the new location. Also `node_modules/` pattern only covered root.
- **Fix:** Added `apps/web/.next/`, `apps/web/out/`, `apps/web/next-env.d.ts` and changed `/node_modules` to also include `node_modules/` for all subdirectories
- **Files modified:** `.gitignore`
- **Commit:** b9b6e36

## Known Stubs

None — this plan is purely structural migration. All app source files are intact and functional at new paths.

## Next Phase Readiness

- 4-package pnpm workspace is operational
- `pnpm --filter web dev` starts the Next.js app (human-verified: approved)
- `pnpm --filter web typecheck` and `pnpm --filter web build` confirmed working
- Phase 2 (encoder extraction) can begin after checkpoint approval

## Self-Check: PASSED

- FOUND: apps/web/src/app/page.tsx
- FOUND: apps/web/tsconfig.json (extends ../../tsconfig.base.json)
- FOUND: apps/web/package.json (name: "web")
- FOUND: apps/web/next.config.ts
- NOT FOUND: tsconfig.json (correctly deleted)
- NOT FOUND: src/ at root (correctly moved)
- FOUND commit: 4d4ee93 (Task 1)
- FOUND commit: b9b6e36 (Task 2)

---
*Phase: 01-monorepo-scaffolding*
*Completed: 2026-04-02*
