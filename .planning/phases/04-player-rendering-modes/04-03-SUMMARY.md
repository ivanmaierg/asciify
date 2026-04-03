---
phase: 04-player-rendering-modes
plan: 03
subsystem: testing
tags: [vitest, playwright, snapshot-testing, web-component, chromium, browser-testing]

# Dependency graph
requires:
  - phase: 04-01
    provides: renderGridFrame, renderProportionalFrame, renderTypewriterFrame, TypewriterReveal
  - phase: 04-02
    provides: AsciiPlayerElement web component, IIFE bundle, trigger/mode attributes
provides:
  - Vitest inline snapshot tests capturing deterministic canvas call sequences for all three render modes (TEST-04)
  - Extended integration tests verifying new exports in dist bundles (TEST-03)
  - Playwright browser tests for real Chromium custom element behavior (TEST-05)
  - playwright.config.ts for the @asciify/player package
affects: [publishing, ci-pipeline]

# Tech tracking
tech-stack:
  added: ["@playwright/test ^1.59.1"]
  patterns:
    - "Inline snapshot testing: makeRecordingCtx captures draw calls as strings for deterministic regression baselines"
    - "Browser tests: readFileSync + page.setContent with IIFE bundle avoids live server requirement"
    - "ESM __dirname compat: fileURLToPath(new URL('.', import.meta.url)) pattern for spec files"

key-files:
  created:
    - packages/player/tests/snapshot.test.ts
    - packages/player/tests/browser/web-component.spec.ts
    - packages/player/playwright.config.ts
  modified:
    - packages/player/tests/integration.test.ts
    - packages/player/package.json

key-decisions:
  - "makeRecordingCtx records draw calls as strings (not vi.fn mock.calls) so toMatchInlineSnapshot shows readable diffs"
  - "Playwright uses chromium headless via chromium_headless_shell — installed at test time to match playwright version"
  - "fileURLToPath(import.meta.url) used instead of __dirname since package.json has type:module"
  - "playwright test:browser script runs pnpm build first so dist/index.global.js is always fresh"

patterns-established:
  - "Snapshot tests: recording ctx pattern — capture draw calls as string[] then toMatchInlineSnapshot"
  - "Integration tests: readFileSync dist files to verify bundling constraints without module resolution"
  - "Browser tests: inject IIFE via page.setContent to avoid live server, verify DOM + globals"

requirements-completed: [TEST-03, TEST-04, TEST-05]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 4 Plan 03: Test Suite — Snapshot, Integration, and Playwright Browser Tests

**Vitest inline snapshot tests for canvas call sequences, extended dist bundle integration checks, and 7 Playwright browser tests verifying custom element registration and IIFE global in real Chromium**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-03T20:17:23Z
- **Completed:** 2026-04-03T20:21:34Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `snapshot.test.ts` with 8 `toMatchInlineSnapshot` assertions capturing deterministic canvas call sequences for grid, proportional, and typewriter render modes — provides regression baselines for renderer.ts
- Extended `integration.test.ts` with 9 new checks verifying `renderProportionalFrame`, `renderTypewriterFrame`, `TypewriterReveal`, `charTimestamps`, `RenderMode`, `TriggerMode` all exist in dist bundles (ESM + IIFE + type definitions)
- Set up Playwright with `playwright.config.ts` and 7 browser tests that inject the IIFE bundle via `page.setContent`, verifying custom element registration, attribute reflection, Shadow DOM canvas, and `window.Asciify` global in real headless Chromium

## Task Commits

Each task was committed atomically:

1. **Task 1: Create snapshot tests and extend integration tests** - `2e2fb0a` (test)
2. **Task 2: Set up Playwright and create browser tests** - `2c43f62` (feat)

**Plan metadata:** _(pending)_

## Files Created/Modified
- `packages/player/tests/snapshot.test.ts` - Inline snapshot tests for grid/proportional/typewriter render modes using makeRecordingCtx
- `packages/player/tests/integration.test.ts` - Extended with 9 new dist bundle content checks for new exports
- `packages/player/playwright.config.ts` - Playwright config targeting tests/browser with chromium headless
- `packages/player/tests/browser/web-component.spec.ts` - 7 Playwright tests for custom element DOM behavior
- `packages/player/package.json` - Added @playwright/test devDep and test:browser script

## Decisions Made
- `makeRecordingCtx` records draw calls as `string[]` (not `vi.fn().mock.calls`) so `toMatchInlineSnapshot` produces human-readable diffs showing exact canvas operations
- Playwright `chromium_headless_shell-1217` needed to be installed to match `@playwright/test@1.59.1` (cached chromium-1200 was for an older version) — installed via `npx playwright install chromium`
- Used `fileURLToPath(new URL('.', import.meta.url))` instead of `__dirname` since the player package has `"type": "module"` in package.json
- `test:browser` script runs `pnpm build` first to guarantee `dist/index.global.js` is always up-to-date before browser tests read it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESM __dirname not available in spec file**
- **Found during:** Task 2 (Playwright browser tests)
- **Issue:** `__dirname is not defined in ES module scope` — package has `"type": "module"` so spec files run as ES modules
- **Fix:** Added `import { fileURLToPath } from 'node:url'` and `const __dirname = fileURLToPath(new URL('.', import.meta.url))`
- **Files modified:** `packages/player/tests/browser/web-component.spec.ts`
- **Verification:** Tests ran and found the IIFE bundle correctly
- **Committed in:** `2c43f62` (Task 2 commit)

**2. [Rule 3 - Blocking] Playwright @1.59.1 requires Chromium 1217, cache had 1200**
- **Found during:** Task 2 verification
- **Issue:** Plan said "browsers are already cached at chromium-1200" but installed playwright@1.59.1 requires chromium_headless_shell-1217
- **Fix:** Ran `npx playwright install chromium` to fetch only the headless shell (92 MB) matching the installed playwright version
- **Files modified:** none (browser binary only)
- **Verification:** All 7 Playwright tests passed
- **Committed in:** `2c43f62` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues)
**Impact on plan:** Both fixes required for tests to run. No scope creep.

## Issues Encountered
- `executablePath` in playwright config pointing to chromium-1200 was ignored because playwright still looked for `chromium_headless_shell-1217` (the headless shell variant is separate from the full chrome binary). Installing via `npx playwright install chromium` resolved this cleanly.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 4 complete: full test suite green (127 vitest unit/snapshot/integration + 7 playwright browser)
- All three render modes (grid, proportional, typewriter) have snapshot regression baselines
- IIFE bundle verified working in real Chromium via browser tests
- Ready for Phase 5 or publishing phase

---
*Phase: 04-player-rendering-modes*
*Completed: 2026-04-03*
