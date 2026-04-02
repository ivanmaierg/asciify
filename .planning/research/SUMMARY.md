# Project Research Summary

**Project:** Asciify monorepo migration — @asciify/encoder + @asciify/player
**Domain:** npm package extraction from a Next.js app into a pnpm + Turborepo monorepo
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

This project is a monorepo migration that extracts two publishable npm packages from an existing Next.js web application. The app already contains production-quality ASCII conversion logic (`ascii-engine.ts`, `pretext-renderer.ts`, `delta-encoder.ts`) and a working embedded player runtime — the goal is to restructure the repo so those capabilities become independently installable libraries (`@asciify/encoder` and `@asciify/player`) while keeping the web app functional throughout. The recommended approach is an in-place migration: the repo root becomes the workspace root, the existing Next.js app moves into `apps/web/`, and two new packages are created under `packages/`. The stack is well-settled: pnpm 10 + Turborepo 2.9 for workspace orchestration, tsup 8.5 for dual ESM+CJS library builds, and TypeScript ^5 (not TS6 — Next.js compatibility unconfirmed).

The key architectural decision is already made: `@asciify/player` bundles `@chenglou/pretext` internally (not a peer dependency), and neither package depends on the other — `apps/web` is the composition point. The canonical JSON data format is the only shared contract, and it must be formally specified before either package is published. The player differentiates from existing ASCII player libraries by supporting four rendering modes: grid (monospace baseline), proportional font (pretext-powered), typewriter, and reflow. Most of this code either already exists or is a straightforward port.

The most critical risk is the pnpm phantom dependency audit: the current repo uses npm's flat hoisting, and the migration will surface any imports that rely on transitive dependencies without declaring them. This must be resolved before anything else. The second critical risk is the tsup bundling configuration for `@asciify/player` — `@chenglou/pretext` must be placed in `devDependencies` with `noExternal` set in tsup, otherwise it ships as an external import that breaks on install. Both risks are well-understood and have clear prevention steps.

## Key Findings

### Recommended Stack

The toolchain is fully decided by `PROJECT.md` and validated by research. pnpm 10.33.0 with strict workspace isolation prevents phantom dependencies and provides the `workspace:*` protocol for local package linking. Turborepo 2.9.3 parallelizes and caches builds across packages via content-hash; the `"dependsOn": ["^build"]` task dependency ensures packages build before the app. tsup 8.5.1 produces dual ESM+CJS output with `.d.ts` generation from a minimal config — it is purpose-built for library authoring and handles the pretext bundling requirement via `noExternal`. TypeScript stays pinned to `^5` (TS 6 exists at 6.0.2 but Next.js 16 compatibility is unconfirmed). Vitest 4.1.2 with `environment: 'jsdom'` handles browser-API-dependent unit tests.

**Core technologies:**
- **pnpm 10.33.0**: Package manager + workspace protocol — strict isolation prevents phantom deps; `workspace:*` links local packages without publish
- **Turborepo 2.9.3**: Task orchestration + build caching — `^build` dependency syntax ensures correct build order; caches by input hash
- **tsup 8.5.1**: Library bundler for both packages — zero-config dual ESM+CJS output; `noExternal` inlines pretext into player bundle
- **@changesets/cli 2.30.0**: Versioning + changelogs — PR-flow based; per-package semver bumps; pnpm-aware
- **vitest 4.1.2**: Test runner — native ESM; jsdom environment for browser API testing; no transform config needed
- **TypeScript ^5**: Type checking — stay on ^5 until Next.js 16 confirms TS6 support

### Expected Features

The feature set is grounded in the existing codebase — most encoder functionality already exists in `ascii-engine.ts` and needs to be ported, not invented.

**Must have (table stakes) — @asciify/encoder:**
- `convertFrameToAscii(imageData, options): AsciiFrame` — core function, already implemented
- All types exported: `AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`
- `deltaEncode` + `rleEncode` re-exported as encoding utilities
- Multi-pass rendering path (gamma, Sobel edge detection, Floyd-Steinberg / Bayer dithering) — already implemented
- Canonical JSON data format spec matching player input

**Must have (table stakes) — @asciify/player:**
- Web Component (`<asciify-player>`) with Shadow DOM isolation
- ES Module imperative API (`new AsciiPlayer(canvas, data, opts)`)
- `play()` / `pause()` / `seekTo()` methods; configurable FPS; loop modes
- Grid mode (monospace) rendering
- Proportional font mode via pretext (key differentiator — no competitor supports this)
- TypeScript types shipped; ESM + CJS dual output; CDN IIFE build

**Should have (competitive differentiators):**
- Typewriter mode — character-by-character reveal (absent from all existing ASCII player libs)
- Typewriter timestamp mode — per-character timing table for audio sync
- Scroll-triggered playback (`trigger="scroll"` via IntersectionObserver)
- Named themes (`theme="green-on-black"`)
- `currentTime` / `duration` / `ended` event API (HTMLMediaElement-familiar pattern)

**Defer (v2+):**
- Reflow mode — highest complexity; needs ResizeObserver + layout recalculation with debounce; flag for deeper research before implementing
- React/Vue/Svelte adapters — Web Component works everywhere; document with copy-paste snippets instead
- CDN/IIFE build — nice-to-have; can ship post-initial publish

### Architecture Approach

The monorepo has a strict one-way dependency graph: `apps/web` imports both packages; the packages do not depend on each other. The canonical JSON format (`AsciiPlayerData`) is the data contract between encoder output and player input — it must carry a `version: 1` field for forward compatibility, `meta` (fps, cols, rows, colorMode, font), and `frames` (text string + optional cells array). The encoder's existing `delta-encoder.ts` and `rle.ts` compression are layers on top of this format, not part of the spec itself. The player uses Shadow DOM for canvas isolation and exposes a minimal reflected attribute API.

**Major components:**
1. **@asciify/encoder** — Pure function library: `convertFrameToAscii(ImageData, config) → AsciiFrame`; no state, no side effects; safe to call from Web Workers
2. **@asciify/player** — Canvas animation engine: Web Component + ES Module class; four rendering modes (grid, proportional, typewriter, reflow); `@chenglou/pretext` bundled internally
3. **Canonical JSON spec** — The `AsciiPlayerData` interchange format: version field + meta + frames; produced by `apps/web` orchestration, consumed by player
4. **apps/web** — Composition layer: runs encoder in Worker, collects frames, feeds player for live preview and export; holds all export format generators (HTML, SVG, ANSI)

### Critical Pitfalls

1. **Phantom dependencies break pnpm migration** — Audit every import in `src/` against declared `package.json` deps before switching. Run `pnpm build` immediately after `pnpm install` and fix all `Cannot find module` errors before proceeding.

2. **pretext bundled as external by default** — Put `@chenglou/pretext` in `devDependencies` (not `dependencies`) and set `noExternal: ['@chenglou/pretext']` in `packages/player/tsup.config.ts`. Verify with `grep -r "chenglou/pretext" dist/` post-build — absence confirms it was inlined.

3. **Incorrect `exports` field blocks consumers** — Use full conditional exports map with explicit `import`/`require`/`types` conditions on every entry. Run `npx publint` from each package before publishing. Missing `types` under `moduleResolution: "bundler"` silently drops all TypeScript types (no error, just `any`).

4. **Turborepo `dependsOn: ["^build"]` misconfiguration causes stale builds** — This must be set correctly from day one. Without it, editing a package does not invalidate the app's build cache. Set `"cache": false` on the `dev` task.

5. **Web Component crashes in SSR context** — Guard all browser API calls (`customElements.define`, Canvas, `requestAnimationFrame`) inside lifecycle callbacks, not at module top level. In `apps/web`, use `next/dynamic` with `ssr: false` for any component importing `@asciify/player`.

## Implications for Roadmap

Based on combined research, a 6-phase structure is recommended, following the build order documented in ARCHITECTURE.md:

### Phase 1: Monorepo Scaffolding
**Rationale:** Everything else depends on this. The workspace must exist before packages can be created. This phase is pure infrastructure — no application code moves yet, so the app stays fully functional.
**Delivers:** pnpm workspace root; Turborepo task graph; shared `tsconfig.base.json`; `apps/web/` directory with app moved in; `pnpm --filter web dev` working
**Addresses:** Workspace layout, package manager migration (npm → pnpm)
**Avoids:** Phantom dependency breakage (Pitfall 1) — audit imports before running `pnpm install`; package-lock.json conflict (Pitfall 11) — delete before switching

### Phase 2: Extract @asciify/encoder
**Rationale:** Encoder has no runtime dependencies — it is the lowest-risk extraction. It must exist and build cleanly before the player can reference it (conceptually) and before `apps/web` can use workspace imports. Formally specifying the canonical JSON format here prevents the player from shipping with an incompatible input shape.
**Delivers:** `packages/encoder/` with tsup build; all types exported; canonical `AsciiPlayerData` JSON spec document; `apps/web` updated to import from `@asciify/encoder`
**Uses:** tsup 8.5, TypeScript ^5, pnpm workspace:* protocol
**Implements:** encoder component boundary, canonical data format spec
**Avoids:** Inline worker breakage (Pitfall 9) — keep Blob string approach; moduleResolution type drops (Pitfall 7) — add `types` condition to exports map

### Phase 3: @asciify/player Scaffold + Grid Mode
**Rationale:** Grid mode is the simplest rendering mode and reuses the most existing code. Establishing the Web Component structure, Shadow DOM, attribute API, and pretext bundling before implementing complex modes validates the architecture without high risk.
**Delivers:** `packages/player/` with tsup build; `<asciify-player>` Web Component; `AsciiPlayer` ES class; grid mode working; pretext confirmed bundled (not external) in dist output
**Uses:** tsup `noExternal`, Shadow DOM, ES Custom Elements v1
**Implements:** Web Component architecture, pretext bundling
**Avoids:** pretext shipped as external (Pitfall 2); SSR crash (Pitfall 6) — guard browser APIs in lifecycle callbacks; incorrect exports map (Pitfall 3) — full conditional exports + `publint`

### Phase 4: Player Rendering Modes
**Rationale:** These build on the scaffold established in Phase 3. Proportional and typewriter modes are the primary differentiators — they should ship in v1. Reflow mode is the highest-complexity mode and should be implemented last within this phase (or deferred to a later release if it proves blocked).
**Delivers:** Proportional font mode (pretext `prepare` + font-loading guard); typewriter mode; typewriter timestamp mode; reflow mode (if complexity is manageable)
**Implements:** All four rendering mode components in `packages/player/src/modes/`
**Research flag:** Reflow mode needs focused research before implementation — `layoutNextLine` variable-width behavior + `ResizeObserver` debounce strategy is insufficiently understood; see FEATURES.md observation #5

### Phase 5: App Integration
**Rationale:** Only after both packages build cleanly and their APIs are stable should the app migration happen. This phase replaces `apps/web`'s internal `pretext-renderer.ts` with `@asciify/player` for live preview, and updates the HTML export to embed the compiled player bundle instead of its current inline runtime copy.
**Delivers:** `apps/web` live preview using `@asciify/player`; HTML export referencing compiled player bundle (eliminates the diverged inline runtime); `next/dynamic ssr: false` wrapper for Web Component
**Implements:** Data flow: encoder → canonical JSON → player
**Avoids:** SSR crash in Next.js (Pitfall 6); Next.js `transpilePackages` requirement (Pitfall 15) — keep exports pointing at compiled `dist/`, never raw `.ts`

### Phase 6: Publishing
**Rationale:** Final phase; packages must be fully stable and tested before publishing. Scope claim and publish config must be verified early (flagged as pre-work, not end-of-project work).
**Delivers:** Published `@asciify/encoder` and `@asciify/player` on npm; `publishConfig.access: "public"` in both packages; `@changesets/cli` configured; verified no `workspace:*` strings in published package.json
**Avoids:** Scope not claimed (Pitfall 5) — verify `@asciify` org ownership before Phase 1; workspace protocol published raw (Pitfall 8) — always use `pnpm publish`, never `npm publish`

### Phase Ordering Rationale

- Phases 1 → 2 → 3 follow strict architectural dependency: workspace must exist before packages, encoder before canonical JSON spec is formalized, player scaffold before rendering modes are layered in
- Keeping the app running throughout is enforced by copying before deleting (copy `ascii-engine.ts` to encoder; only remove original from `apps/web` after imports are updated)
- Reflow mode is isolated to Phase 4 and explicitly flagged — it has ResizeObserver performance unknowns that should not block the other three modes
- Publishing is last because `@asciify/encoder` and `@asciify/player` share the same scope; both should be in good shape before either is published

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Reflow mode):** ResizeObserver + pretext `layoutNextLine` interaction under rapid resize is not fully characterized; canvas height reflow without layout thrash needs a specific debounce/RAF strategy
- **Phase 6 (Publishing):** `@asciify` npm scope ownership must be verified externally before any publish infrastructure is built; if the scope is claimed, package names need to change

Phases with standard patterns (can skip additional research):
- **Phase 1 (Scaffolding):** pnpm + Turborepo setup is extremely well-documented; follow STACK.md config files verbatim
- **Phase 2 (Encoder extraction):** Pure port of existing code; tsup config is defined; no architectural uncertainty
- **Phase 3 (Player scaffold + Grid):** Custom Elements v1 + Shadow DOM + tsup are standard; pretext bundling pattern is explicit in research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified from npm registry; config files defined with rationale in STACK.md |
| Features | HIGH | Grounded in existing production code; feature list derived from direct codebase analysis, not speculation |
| Architecture | HIGH | Direct source analysis of all relevant files; monorepo conventions are well-established |
| Pitfalls | HIGH | All 15 pitfalls are well-documented in official tool documentation; pnpm/tsup/Turborepo behaviors verified |

**Overall confidence:** HIGH

### Gaps to Address

- **Reflow mode complexity:** `layoutNextLine` variable-width behavior under container resize is not fully characterized in pretext documentation. Before implementing, prototype the resize → reflow → canvas-height-update loop to measure layout thrash.
- **@asciify npm scope ownership:** Cannot be verified from within the codebase. Must be checked against the live npm registry (`npm info @asciify/encoder`) before Phase 6 infrastructure is built. If claimed, all package names, CDN references, and documentation need updating.
- **`measure-char.ts` fate:** The existing `measure-char.ts` is a browser Canvas measurement utility used by `ascii-canvas.tsx`. When the player uses pretext for all rendering modes, this becomes redundant in the player but may still be needed in `apps/web`. Decision: keep in `apps/web/src/lib` only; do not include in either package.
- **HTML export divergence:** `html-export.ts` currently embeds a hardcoded monospace-only player runtime (does not use pretext). Phase 5 resolves this by having the export embed the `@asciify/player` compiled bundle, but this requires a concrete plan for how to reference the bundle path inside the exported HTML template.

## Sources

### Primary (HIGH confidence)
- `src/lib/ascii-engine.ts`, `src/lib/pretext-renderer.ts`, `src/lib/html-export.ts`, `src/lib/delta-encoder.ts` — encoder and player implementation (existing production code)
- `node_modules/@chenglou/pretext/package.json`, `node_modules/@chenglou/pretext/dist/layout.d.ts` — pretext API surface confirmed
- `node_modules/next/dist/docs/` — Next.js 16 package bundling and `transpilePackages` docs
- `.planning/PROJECT.md` — authoritative constraints and key decisions
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md` — existing layering and known tech debt
- npm registry (verified): pnpm 10.33.0, turbo 2.9.3, tsup 8.5.1, vitest 4.1.2, @changesets/cli 2.30.0, @chenglou/pretext 0.0.4

### Secondary (MEDIUM confidence)
- `pdr.md` — competitive landscape and product requirements (owner's own analysis, not independently verified)
- Turborepo `^build` dependency syntax — verified against established 2.x conventions; not re-checked against 2.9.3 changelog specifically

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
