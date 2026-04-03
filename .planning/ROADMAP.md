# Roadmap: Asciify Monorepo

## Overview

This milestone restructures the existing Next.js app into a pnpm + Turborepo monorepo and extracts two publishable npm packages: `@asciify/encoder` (the ASCII conversion engine) and `@asciify/player` (a canvas text animation engine). The journey runs from workspace scaffolding through encoder extraction, player construction with all rendering modes, app integration, and finally publishing both packages to npm with a demo site. The app stays functional throughout — each phase delivers a verifiable capability without breaking what came before.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Scaffolding** - Restructure repo into pnpm workspaces with Turborepo orchestration (completed 2026-04-02)
- [x] **Phase 2: Encoder Package** - Extract @asciify/encoder with canonical JSON data format spec (completed 2026-04-02)
- [x] **Phase 3: Player Scaffold + Grid Mode** - Build @asciify/player Web Component with grid rendering (completed 2026-04-03)
- [x] **Phase 4: Player Rendering Modes** - Add proportional, typewriter, themes, and scroll trigger (completed 2026-04-03)
- [ ] **Phase 5: App Integration** - Wire apps/web to consume both packages for preview and export
- [ ] **Phase 6: Publishing** - Publish both packages to npm with CI, demo site, and CDN build

## Phase Details

### Phase 1: Monorepo Scaffolding
**Goal**: The repository is a working pnpm workspace with the Next.js app running from apps/web
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05
**Success Criteria** (what must be TRUE):
  1. `pnpm --filter web dev` starts the Next.js app and it behaves identically to before migration
  2. `pnpm build` from the workspace root builds all packages in correct dependency order via Turborepo
  3. `packages/` directory exists with correct structure; `package-lock.json` is gone, `pnpm-lock.yaml` exists
  4. All packages and apps share `tsconfig.base.json` for consistent TypeScript settings
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Root workspace config (pnpm-workspace.yaml, turbo.json, tsconfig.base.json, root package.json)
- [x] 01-02-PLAN.md — npm to pnpm migration + package shells (encoder, player stubs)
- [x] 01-03-PLAN.md — Move Next.js app to apps/web/ and verify

### Phase 2: Encoder Package
**Goal**: `@asciify/encoder` is a standalone package installable via npm with all conversion functions and a formally specified canonical JSON data format
**Depends on**: Phase 1
**Requirements**: ENC-01, ENC-02, ENC-03, ENC-04, ENC-05, ENC-06, ENC-07, ENC-08, TEST-01
**Success Criteria** (what must be TRUE):
  1. `import { convertFrameToAscii } from '@asciify/encoder'` works in a fresh project with correct TypeScript types
  2. The package builds to ESM + CJS + types via tsup with no external runtime dependencies
  3. All conversion paths work: monochrome, colored, inverted, monoscale; all dither modes (Floyd-Steinberg, Bayer, Sobel)
  4. `apps/web` imports encoder from `@asciify/encoder` workspace package — local `ascii-engine.ts` is no longer the source of truth
  5. Encoder unit tests pass (`vitest run --project encoder`)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Package tooling setup, source extraction, API refactor, canonical format, and build
- [x] 02-02-PLAN.md — App import migration from local lib to @asciify/encoder
- [x] 02-03-PLAN.md — Encoder unit tests (conversion, compression, format serializers)

### Phase 3: Player Scaffold + Grid Mode
**Goal**: `@asciify/player` exists as a buildable package with a working Web Component and ES Module API rendering ASCII art in grid mode
**Depends on**: Phase 2
**Requirements**: PLR-01, PLR-02, PLR-03, PLR-04, PLR-05, PLR-06, PLR-07, PLR-08, PLR-09, PLR-10, PLR-11, PLR-12, PLR-13, MODE-01, MODE-05
**Success Criteria** (what must be TRUE):
  1. `<ascii-player src="data.json" controls autoplay></ascii-player>` renders and plays ASCII animation on a page with no other setup
  2. `new AsciiPlayer(canvas, data, { fps: 24, loop: 'forever' })` works as an ES Module import with play/pause/seekTo methods
  3. `@chenglou/pretext` is confirmed bundled in `dist/` — no external reference to it in the compiled output
  4. `timeupdate` and `ended` events fire; `currentTime` and `duration` properties reflect playback state
  5. Font loading guard (`document.fonts.load()`) runs before pretext `prepare()` — no flash of unstyled glyphs
**UI hint**: yes
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Package tooling, dependencies, types, and build config
- [x] 03-02-PLAN.md — Core player engine: renderer, playback controller, AsciiPlayer class
- [x] 03-03-PLAN.md — Web Component with Shadow DOM, theming, controls, auto-sizing
- [x] 03-04-PLAN.md — Build integration tests and visual verification

### Phase 4: Player Rendering Modes
**Goal**: All v1 rendering modes are available in `@asciify/player` and the package is fully tested
**Depends on**: Phase 3
**Requirements**: MODE-02, MODE-03, MODE-04, XTRA-01, XTRA-02, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. `<ascii-player mode="proportional" font="'Fira Code', monospace">` renders variable-width ASCII using pretext layout
  2. `<ascii-player mode="typewriter" char-delay="30">` reveals characters one at a time at the configured pace
  3. Typewriter timestamp mode produces per-character timing data suitable for external audio sync
  4. `<ascii-player theme="matrix">` applies a named color theme; `trigger="scroll"` starts playback when the element enters the viewport
  5. Player unit, integration, snapshot, and browser tests all pass
**UI hint**: yes
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Types, proportional renderer, typewriter reveal engine
- [x] 04-02-PLAN.md — Wire modes into AsciiPlayer + Web Component triggers
- [x] 04-03-PLAN.md — Snapshot, integration, and Playwright browser tests

### Phase 5: App Integration
**Goal**: apps/web uses @asciify/player for live preview and the HTML export embeds the compiled player bundle
**Depends on**: Phase 4
**Requirements**: APP-01, APP-02, APP-03
**Success Criteria** (what must be TRUE):
  1. The live preview canvas in apps/web renders via `@asciify/player` — the old internal pretext-renderer.ts is no longer on the hot path
  2. Exported HTML files embed the compiled `@asciify/player` bundle and play back without any additional dependencies
  3. All existing export formats (HTML, WebGPU, APNG, SVG, ANSI) produce correct output after the migration
**UI hint**: yes
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Export renderGridFrame from player, add workspace dep, swap live preview renderer
- [ ] 05-02-PLAN.md — Refactor HTML export to embed player IIFE bundle

### Phase 6: Publishing
**Goal**: Both packages are published to npm under @asciify scope, a demo site is live, and CI runs the full test suite on every PR
**Depends on**: Phase 5
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, TEST-06
**Success Criteria** (what must be TRUE):
  1. `npm install @asciify/encoder` and `npm install @asciify/player` succeed from a fresh directory with correct types
  2. `npx publint` passes for both packages with no warnings
  3. The demo site shows all player modes with interactive examples a developer can copy-paste
  4. A CDN `<script>` tag referencing the IIFE build renders an ASCII player with no npm tooling required
  5. GitHub CI runs the full Turborepo test suite on every PR and fails the build on test failure
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Scaffolding | 3/3 | Complete   | 2026-04-02 |
| 2. Encoder Package | 3/3 | Complete   | 2026-04-02 |
| 3. Player Scaffold + Grid Mode | 4/4 | Complete   | 2026-04-03 |
| 4. Player Rendering Modes | 3/3 | Complete   | 2026-04-03 |
| 5. App Integration | 0/2 | Planning   | - |
| 6. Publishing | 0/? | Not started | - |
