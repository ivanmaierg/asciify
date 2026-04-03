---
phase: 05-app-integration
plan: 01
subsystem: ui
tags: [player, renderer, canvas, ascii, next.js, dynamic-import]

# Dependency graph
requires:
  - phase: 03-player-scaffold-grid-mode
    provides: renderGridFrame function in packages/player/src/renderer.ts
  - phase: 04-player-advanced-modes
    provides: player package fully built with all render modes
provides:
  - renderGridFrame exported from @asciify/player public API
  - apps/web live preview canvas using @asciify/player renderGridFrame
  - IIFE bundle copied to public/player-bundle.js on build (for Plan 02 HTML export)
affects: [05-app-integration, plan-02-html-export]

# Tech tracking
tech-stack:
  added: ["@asciify/player workspace:* in apps/web dependencies"]
  patterns: ["Dynamic import for browser-only packages to avoid Next.js SSR HTMLElement errors", "Lazy-load renderer into useRef to maintain synchronous rAF loop"]

key-files:
  created: []
  modified:
    - packages/player/src/index.ts
    - apps/web/package.json
    - apps/web/src/components/preview/ascii-canvas.tsx

key-decisions:
  - "Dynamic import @asciify/player inside useEffect to avoid HTMLElement-not-defined SSR errors during Next.js static generation; store renderGridFrame in a ref for synchronous access in rAF loop"
  - "IIFE bundle copy-player-bundle script added to web build so public/player-bundle.js is available for Plan 02 HTML export work"

patterns-established:
  - "Browser-only package pattern: use dynamic import in useEffect + store in ref for packages that reference HTMLElement at module evaluation"
  - "dctx.font must be set before calling renderGridFrame since the player renderer inherits font from CanvasRenderingContext2D"

requirements-completed: [APP-01, APP-03]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 5 Plan 01: App Integration — Player Renderer Summary

**Live preview canvas wired to @asciify/player renderGridFrame via dynamic import, with IIFE bundle copied to public/ for HTML export**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-03T17:50:50Z
- **Completed:** 2026-04-03T17:54:05Z
- **Tasks:** 2
- **Files modified:** 3 (plus pnpm-lock.yaml)

## Accomplishments
- Exported `renderGridFrame` from `@asciify/player` public API (was previously internal to the player's own rAF loop)
- Added `@asciify/player: workspace:*` dependency to `apps/web` and updated pnpm lockfile
- Replaced `renderAsciiToCanvas` from internal `pretext-renderer.ts` with `renderGridFrame` from `@asciify/player` on the Canvas2D hot path
- Added `copy-player-bundle` script to copy IIFE bundle to `public/player-bundle.js` at build time
- `pretext-renderer.ts` preserved untouched — APNG export path unaffected (APP-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Export renderGridFrame from player and add workspace dependency** - `3e27615` (feat)
2. **Task 2: Replace pretext-renderer with renderGridFrame in live preview** - `d18ffe4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/player/src/index.ts` - Added `export { renderGridFrame } from './renderer'`
- `apps/web/package.json` - Added `@asciify/player: workspace:*` dep, `copy-player-bundle` script, updated build script
- `apps/web/src/components/preview/ascii-canvas.tsx` - Replaced pretext-renderer import with dynamic @asciify/player import; added renderGridFrameRef; updated Canvas2D render path

## Decisions Made
- **Dynamic import pattern for browser-only packages:** `@asciify/player` references `HTMLElement` at module evaluation time (via `AsciiPlayerElement extends HTMLElement`). A static import in `ascii-canvas.tsx` (even with `'use client'`) causes `ReferenceError: HTMLElement is not defined` during Next.js static prerendering. Fix: dynamic `import('@asciify/player')` inside a `useEffect` — browser-only, runs after hydration. The resolved `renderGridFrame` is stored in `renderGridFrameRef.current` for synchronous access in the rAF loop.
- **fgColor always passed as string:** `renderGridFrame` takes `fgColor: string` (not `string | undefined`). The old `renderAsciiToCanvas` accepted `undefined` to signal "use per-cell colors". `renderGridFrame` handles this internally via `colorMode` — pass `s.foregroundColor` always.
- **ctx.font must be set before renderGridFrame:** The player renderer inherits font from the canvas context. Added `dctx.font = font` before the call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SSR HTMLElement crash with dynamic import**
- **Found during:** Task 2 (Replace pretext-renderer with renderGridFrame in live preview)
- **Issue:** Static import of `@asciify/player` caused `ReferenceError: HTMLElement is not defined` during Next.js `pnpm turbo build` static prerender phase. The web-component.ts file in the player package extends `HTMLElement` at module evaluation time.
- **Fix:** Changed from static `import { renderGridFrame } from '@asciify/player'` to a `useEffect`-based dynamic import that stores the function in `renderGridFrameRef`. Used `renderGridFrameRef.current?.()` at the call site.
- **Files modified:** `apps/web/src/components/preview/ascii-canvas.tsx`
- **Verification:** `pnpm turbo build` succeeds with zero errors; all 192 tests pass
- **Committed in:** d18ffe4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Essential fix — static import crashed the build. Dynamic import achieves same result with no behavior change for end users.

## Issues Encountered
- Next.js SSR prerendering evaluates `'use client'` component modules server-side during static generation, triggering `HTMLElement is not defined` from the player's web-component code. Resolved via dynamic import pattern.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `renderGridFrame` is now a stable public export of `@asciify/player`
- Live preview renders via the player package (APP-01 complete)
- `public/player-bundle.js` is generated on build, ready for Plan 02 HTML export integration
- APNG export path (`pretext-renderer.ts`) fully intact (APP-03 prerequisite met)

---
*Phase: 05-app-integration*
*Completed: 2026-04-03*
