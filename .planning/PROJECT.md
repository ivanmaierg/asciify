# Asciify Monorepo

## What This Is

Asciify is an ASCII video converter that transforms video into animated ASCII art and exports self-contained files. This milestone restructures the single Next.js app into a pnpm + Turborepo monorepo, extracting two publishable npm packages: `@asciify/encoder` (the conversion engine) and `@asciify/player` (a canvas text animation engine powered by @chenglou/pretext). The existing app becomes `apps/web` and consumes both packages.

## Core Value

Developers and creative coders can install `@asciify/player` on any website to render and animate text on canvas — in grid, proportional font, typewriter, or reflow mode — with a single HTML tag or ES import.

## Requirements

### Validated

- ✓ Video → ASCII conversion with brightness mapping, dithering, edge detection — existing
- ✓ Multi-pass rendering pipeline (gamma, Sobel, Floyd-Steinberg, Bayer) — existing
- ✓ Export to HTML, WebGPU, APNG, SVG, ANSI formats — existing
- ✓ Real-time canvas preview with playback controls — existing
- ✓ Web Worker offloading for frame conversion — existing
- ✓ 4 color modes (monochrome, colored, inverted, monoscale) — existing
- ✓ CRT effects (vignette, scanlines, curvature) — existing

### Active

- [x] Monorepo migration (pnpm workspaces + Turborepo) — Phase 1
- [x] `@asciify/encoder` package — pure conversion functions, browser-only, tsup build — Phase 2
- [x] Canonical JSON data format spec for frame data exchange between encoder and player — Phase 2
- [x] `@asciify/player` package — Web Component + ES Module, pretext-powered layout — Phase 3
- [x] Player grid mode — classic fixed-grid ASCII art playback — Phase 3
- [x] Player proportional font mode — variable-width font rendering via pretext — Phase 4
- [x] Player typewriter mode — character-by-character text animation with configurable delay — Phase 4
- [x] Player typewriter timestamp mode — precise timing data for audio sync — Phase 4
- [ ] Player reflow mode — responsive container resize with real-time text reflow
- [x] Refactor `apps/web` to consume both packages internally — Phase 5
- [ ] Demo site / playground showing all player modes
- [ ] Publish both packages to npm under `@asciify` scope

### Out of Scope

- Node.js support for encoder — browser-only for now, avoids node-canvas dependency complexity
- Worker orchestration in encoder package — app decides parallelization strategy
- Server-side rendering of player — canvas-based, browser-only
- Video/media export formats in packages — those stay in the app's export pipeline
- Mobile-optimized player — desktop-first, mobile is a follow-up

## Context

- **Existing codebase:** Next.js 16 + React 19 + Zustand + Tailwind + shadcn/ui. Single-page app with client-side video processing. ~1400 lines of codebase documentation in `.planning/codebase/`.
- **Current rendering:** Uses a simple `measure-char.ts` utility (monospace only). Previously used @chenglou/pretext but replaced it with simpler measurement. Pretext returns as the layout engine inside `@asciify/player` to enable non-monospace rendering modes.
- **Package manager migration:** Currently npm with package-lock.json. Will migrate to pnpm with pnpm-lock.yaml.
- **Build tooling:** tsup for package builds (ESM + CJS output). Turborepo for monorepo task orchestration. Next.js stays as the app framework.
- **Pretext role:** Bundled inside `@asciify/player` (not a peer dep). Provides `prepare()` for one-time glyph measurement and `layoutWithLines()` for per-frame layout calculation (~0.09ms). Essential for proportional font, typewriter, and reflow modes.
- **Target audience:** Developers (npm install, TypeScript types, API docs) AND creative coders (visual demos, CodePen examples, copy-paste friendly).

## Constraints

- **Tech stack**: pnpm + Turborepo + tsup — chosen for monorepo tooling
- **Browser-only**: Both packages target browser environments only (no Node.js runtime)
- **Pretext bundled**: @chenglou/pretext is bundled inside @asciify/player, not exposed as peer dependency
- **In-place migration**: Restructure current repo, preserve git history
- **Package scope**: Published under `@asciify/*` on npm

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pnpm + Turborepo for monorepo | Industry standard, pnpm is fast with strict dependency resolution, Turborepo handles task orchestration | — Pending |
| tsup for package builds | Zero-config library bundler, outputs ESM + CJS, most popular for TS library authoring | — Pending |
| Bundle pretext inside player | Users shouldn't need to know about pretext internals; `npm install @asciify/player` should just work | — Pending |
| Browser-only encoder | Avoids node-canvas complexity; Node.js support can be added later without breaking changes | — Pending |
| All player modes in v1 | Grid, proportional, typewriter, reflow — user wants full feature set in first release | — Pending |
| Canonical JSON data format | Clean spec as interchange format; compact delta-encoded format as optimization layer on top | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-03 after Phase 5 completion*
