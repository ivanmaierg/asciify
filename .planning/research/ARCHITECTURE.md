# Architecture Patterns

**Domain:** Monorepo migration — pnpm + Turborepo + extracting publishable packages from a Next.js app
**Researched:** 2026-04-02
**Confidence:** HIGH (derived from direct codebase analysis + established monorepo conventions)

---

## Recommended Monorepo Directory Layout

The in-place migration restructures the repo root to become the monorepo workspace root. The existing `src/` is relocated into `apps/web/src/`. Two new packages are created under `packages/`.

```
asciify/                              ← workspace root (stays at repo root)
├── apps/
│   └── web/                          ← the existing Next.js app
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/                  ← trimmed: ascii-engine.ts and render utils extracted
│       │   ├── stores/
│       │   └── types/
│       ├── package.json              ← name: "web", private: true
│       ├── tsconfig.json             ← extends ../../tsconfig.base.json
│       └── next.config.ts
├── packages/
│   ├── encoder/                      ← @asciify/encoder
│   │   ├── src/
│   │   │   └── index.ts              ← re-exports from ascii-engine.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── player/                       ← @asciify/player
│       ├── src/
│       │   ├── index.ts              ← ES Module entry
│       │   ├── player-element.ts     ← Web Component class definition
│       │   ├── renderer.ts           ← canvas rendering (pretext-based)
│       │   ├── types.ts              ← AsciiPlayerData, AsciiFrame, etc.
│       │   └── modes/
│       │       ├── grid.ts
│       │       ├── proportional.ts
│       │       ├── typewriter.ts
│       │       └── reflow.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── tsconfig.base.json                ← shared TS config (target, strict, paths)
├── pnpm-workspace.yaml               ← workspace: [apps/*, packages/*]
├── turbo.json                        ← task graph: build, dev, lint, type-check
└── package.json                      ← root: private:true, devDeps: turbo, typescript
```

**Key constraint:** `apps/web` must be able to `import { convertFrameToAscii } from '@asciify/encoder'` and `import '@asciify/player'` using pnpm workspace protocol (`"@asciify/encoder": "workspace:*"`).

---

## Package Dependency Graph

```
@asciify/player
    └── @chenglou/pretext  (bundled, not peer dep)
    └── NO dependency on @asciify/encoder

@asciify/encoder
    └── NO external runtime deps (pure TS, browser APIs only)

apps/web
    ├── @asciify/encoder  (workspace:*)
    └── @asciify/player   (workspace:*)
```

**@asciify/player does NOT depend on @asciify/encoder.** The rationale:

1. The player's input is the canonical JSON frame format (see Data Format section below). It does not invoke conversion logic — that is the encoder's job.
2. Keeping the two packages decoupled means the player can be embedded on any site using pre-encoded data files without pulling in ImageData processing code.
3. The app (`apps/web`) is the composition point: it runs the encoder to produce frame data, then passes that data to the player component or uses it for export.

**Dependency direction is strictly:** `apps/web` → `@asciify/encoder`, `apps/web` → `@asciify/player`. The packages themselves have no cross-dependency.

---

## Component Boundaries

| Component | Package | Responsibility | Inputs | Outputs |
|-----------|---------|----------------|--------|---------|
| `convertFrameToAscii` | `@asciify/encoder` | ImageData → AsciiFrame conversion (single-pass and multi-pass) | `ImageData`, config params | `AsciiFrame` |
| `AsciiFrame` / `AsciiCell` types | `@asciify/encoder` | Shared value objects | — | Type definitions |
| `<asciify-player>` Web Component | `@asciify/player` | Declarative HTML embedding of player | `data` attribute (JSON), HTML attributes for config | Renders to internal canvas |
| `AsciiPlayer` ES class | `@asciify/player` | Programmatic control (play, pause, seek, load) | `AsciiPlayerData`, canvas element | DOM mutations, events |
| Grid mode renderer | `@asciify/player` | Fixed-grid monospace canvas rendering | `AsciiFrame[]`, font metrics | Canvas draw calls |
| Proportional renderer | `@asciify/player` | Variable-width font rendering via pretext | `AsciiFrame[]`, font string, container width | Canvas draw calls |
| Typewriter mode | `@asciify/player` | Character-by-character animation with delay timing | `AsciiFrame[]`, delay config | Timed canvas draw calls |
| Reflow mode | `@asciify/player` | Responsive resize + real-time text reflow | `AsciiFrame[]`, ResizeObserver | Reflow + canvas draw calls |
| Canonical JSON spec | interchange format | Frame data exchange between encoder output and player input | `AsciiFrame[]` + metadata | `AsciiPlayerData` JSON |

---

## Data Format Design

The canonical JSON format is the contract between encoder output and player input. It must be self-contained so a pre-encoded `.json` file can be loaded directly into the player with no encoder present.

### AsciiPlayerData (canonical JSON spec)

```typescript
interface AsciiPlayerData {
  version: 1                           // spec version for forward compatibility
  meta: {
    cols: number                       // grid columns
    rows: number                       // grid rows
    fps: number                        // playback frame rate
    colorMode: 'monochrome' | 'colored' | 'inverted' | 'monoscale'
    fontFamily: string
    fontSize: number
    lineHeight: number
    loop: 'forever' | 'once' | number
  }
  frames: AsciiFrameData[]
}

// Option A: uncompressed (human-readable, easy to inspect)
interface AsciiFrameData {
  text: string                         // newline-separated rows of characters
  cells?: AsciiCellData[][]           // omitted for monochrome mode
}

interface AsciiCellData {
  r: number                            // 0-255
  g: number
  b: number
  brightness: number
}
```

**Design decisions:**

- `cells` is optional: omit entirely for `monochrome` and `inverted` modes (text only). This keeps monochrome exports small.
- `version: 1` top-level field enables the player to reject or adapt to format changes without silent corruption.
- The player reads `meta.colorMode` to determine whether to expect `cells` arrays.
- Delta/RLE encoding (the existing `delta-encoder.ts` + `rle.ts` machinery) is a compression layer on top of this format, not part of the spec itself. The player can support both uncompressed and compressed frames by checking whether a frame field is a string (RLE keyframe) vs array (delta patches) — the same union type already in `EncodedFrame`.

**Extending for typewriter timestamp mode:** Add an optional `timestamps` array per frame with per-character reveal times in milliseconds. This is additive and non-breaking.

```typescript
interface AsciiFrameData {
  text: string
  cells?: AsciiCellData[][]
  timestamps?: number[]               // per-character reveal time (ms), for typewriter sync
}
```

---

## Web Component Architecture

### Shadow DOM vs Light DOM

**Use Shadow DOM.** Rationale:

1. The player's internal canvas, styles, and resize logic must not be affected by the host page's CSS resets, font loading, or specificity wars.
2. `@asciify/player` targets creative coders embedding it in arbitrary sites. Shadow DOM provides reliable isolation.
3. Slotted content is not needed — the player is purely a canvas renderer, not a content container.

The component exposes a minimal reflected attribute API. Internal DOM is hidden.

### Attribute API (declarative HTML embedding)

```html
<asciify-player
  src="./animation.json"
  mode="grid"
  autoplay
  loop="forever"
  controls
></asciify-player>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `src` | string | URL to AsciiPlayerData JSON |
| `data` | string | Inline JSON (for small payloads / CodePen use) |
| `mode` | `grid \| proportional \| typewriter \| reflow` | Rendering mode |
| `autoplay` | boolean | Start on load |
| `loop` | `forever \| once \| number` | Loop behavior |
| `controls` | boolean | Show built-in playback bar |
| `font` | string | Override font family |

### ES Module API (programmatic use)

```typescript
import { AsciiPlayer } from '@asciify/player'

const player = new AsciiPlayer(canvas, data, { mode: 'proportional' })
player.play()
player.seek(frameIndex)
player.destroy()
```

The Web Component wraps the `AsciiPlayer` class. They share the same rendering core.

### Bundling @chenglou/pretext Inside the Package

pretext is a pure ESM package (`"type": "module"` in its package.json, no CJS build). tsup handles this correctly via its `bundle: true` default — it traces the import graph from `packages/player/src/index.ts` and inlines pretext's code into the output bundle.

**tsup config for `@asciify/player`:**

```typescript
// packages/player/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // pretext is bundled (not listed in dependencies, listed in devDependencies)
  // tsup bundles everything by default; only noExternal is needed if something
  // is in dependencies but still needs to be bundled
  external: [],   // nothing is external; pretext is bundled
  platform: 'browser',
  target: 'es2020',
})
```

**package.json for `@asciify/player`:**

```json
{
  "name": "@asciify/player",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {},
  "devDependencies": {
    "@chenglou/pretext": "0.0.3"
  }
}
```

Listing pretext in `devDependencies` (not `dependencies`) is the correct signal: consumers do not need to install it because it is inlined. If it were in `dependencies`, package managers would install it alongside the package unnecessarily.

**tsup config for `@asciify/encoder`:**

```typescript
// packages/encoder/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  platform: 'browser',
  target: 'es2020',
})
```

The encoder has no runtime dependencies to bundle — it only imports `ImageData` from browser APIs which are ambient globals.

### Note on constants.ts

`ascii-engine.ts` currently imports `ColorMode` and `DitherMode` from `@/lib/constants`. When extracted to `@asciify/encoder`, those types must either:
- Move into the encoder package (preferred: types belong with the code that uses them), or
- Be re-exported by the encoder so `apps/web` can import them from the same package.

The encoder's `src/index.ts` should export: `convertFrameToAscii`, `AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`.

---

## Turborepo Task Graph

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": []
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

`"dependsOn": ["^build"]` means: before building this package, build all packages it depends on. This ensures `@asciify/encoder` and `@asciify/player` are built before `apps/web` runs `next build`.

---

## Data Flow in the Monorepo

```
User video input
      │
      ▼
apps/web: frame-extractor.ts
      │  (Web Worker)
      ▼
@asciify/encoder: convertFrameToAscii(ImageData, ...) → AsciiFrame
      │
      ▼
apps/web: collects AsciiFrame[] → serializes to AsciiPlayerData JSON
      │
      ├─────────────────────────────────────┐
      ▼                                     ▼
apps/web: live preview                @asciify/player
  (uses pretext-renderer.ts            (AsciiPlayer / Web Component)
   or migrated renderer)               renders AsciiPlayerData to canvas
      │                                     │
      ▼                                     ▼
Real-time canvas preview           Exported HTML / standalone player
```

**Renderer migration path:** `apps/web`'s `pretext-renderer.ts` is currently a thin canvas 2D renderer. The new `@asciify/player` renderer subsumes its role. The app's live preview can be migrated to use `@asciify/player` in grid mode after the package stabilizes.

---

## Build Order for Migration

The following sequence is safe: each step keeps the app functional at all times.

### Phase 1 — Monorepo Scaffolding (no code moves yet)
1. Add `pnpm-workspace.yaml` at repo root
2. Create root `package.json` (private, add `turbo` devDep)
3. Create `turbo.json` with task graph
4. Create `tsconfig.base.json` with shared compiler options
5. Create `apps/web/` directory, move all existing files into it
6. Update `apps/web/package.json` (name: "web")
7. Run `pnpm install` at root — verify `apps/web` dev server still works

**Checkpoint:** `pnpm --filter web dev` must start the Next.js app without errors.

### Phase 2 — Extract @asciify/encoder
1. Create `packages/encoder/` with `package.json`, `tsconfig.json`, `tsup.config.ts`
2. Copy `src/lib/ascii-engine.ts` to `packages/encoder/src/index.ts`
3. Move `ColorMode`, `DitherMode` types from `constants.ts` into encoder (or re-export them)
4. Add encoder as workspace dep in `apps/web/package.json`
5. Update imports in `apps/web` to use `@asciify/encoder` instead of `@/lib/ascii-engine`
6. Verify app still works
7. Keep `constants.ts` in `apps/web` for app-only constants (charset definitions, UI defaults)

**Checkpoint:** `pnpm --filter @asciify/encoder build` produces `dist/`. `pnpm --filter web build` succeeds.

### Phase 3 — Create @asciify/player scaffold
1. Create `packages/player/` with package.json, tsconfig.json, tsup.config.ts
2. Add `@chenglou/pretext` as devDep in the player package
3. Implement `AsciiPlayer` class with grid mode only (stub other modes)
4. Implement `<asciify-player>` Web Component wrapping the class
5. Export the canonical `AsciiPlayerData` type
6. Build and verify ESM + CJS output bundles correctly with pretext inlined

**Checkpoint:** `pnpm --filter @asciify/player build` — inspect `dist/index.js` to confirm pretext code is inlined. No `@chenglou/pretext` import in output.

### Phase 4 — Player modes implementation
1. Implement proportional font mode (pretext `prepare` + `layoutWithLines`)
2. Implement typewriter mode
3. Implement reflow mode (ResizeObserver-driven)
4. Implement typewriter timestamp mode

### Phase 5 — App integration
1. Add `@asciify/player` workspace dep to `apps/web`
2. Use player in `apps/web` for live preview (replaces `pretext-renderer.ts`)
3. HTML export embeds `@asciify/player` dist as self-contained runtime

### Phase 6 — Publish
1. Configure `changesets` or manual versioning
2. `pnpm --filter @asciify/encoder publish`
3. `pnpm --filter @asciify/player publish`

---

## Migration Without Breaking the App

**The critical rule:** never leave the app in an unrunnable state between commits.

Specific strategies:

1. **Copy, don't move, during extraction.** Copy `ascii-engine.ts` into the encoder package first. Only delete the original from `apps/web/src/lib/` after all imports in `apps/web` are updated to point to `@asciify/encoder`. This gives a safe rollback point.

2. **Use workspace:* protocol during development.** `"@asciify/encoder": "workspace:*"` in `apps/web/package.json` means pnpm symlinks the local package. No `npm pack` / publish required during development.

3. **Turborepo `dev` task with `dependsOn: ["^build"]`.** When running `pnpm turbo dev`, the encoder and player are built before the Next.js dev server starts. Hot reload in `apps/web` does not rebuild packages — this is acceptable; changes to package source require `pnpm --filter @asciify/encoder build` explicitly during development.

4. **Keep `@/lib/constants.ts` in `apps/web`.** Do not try to share constants via a shared package in the first milestone. UI-facing defaults (column counts, FPS options, font presets) are app-specific. Only the types that are part of the encoder's API contract move with it.

5. **Path alias migration.** `apps/web` uses `@/lib/...` path aliases today. After moving files, update `apps/web/tsconfig.json` to set `"paths": { "@/*": ["./src/*"] }`. The path alias stays the same; only the actual file locations of extracted modules change (to package imports, not alias paths).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Types Package
**What:** Creating a third package `@asciify/types` for shared interfaces.
**Why bad:** `AsciiFrame` / `AsciiCell` are only shared between encoder and app. The player has its own input format (`AsciiPlayerData`). A types package creates an extra dependency hop and a maintenance burden for a problem that doesn't exist: each package defines its own types at its public boundary.
**Instead:** `@asciify/encoder` exports its types (`AsciiFrame`, `AsciiCell`, `ColorMode`). `@asciify/player` exports its types (`AsciiPlayerData`, `AsciiFrameData`). `apps/web` imports types from the relevant package.

### Anti-Pattern 2: Making pretext a peer dependency of @asciify/player
**What:** Listing `@chenglou/pretext` as `peerDependencies` so consumers install it themselves.
**Why bad:** pretext is an implementation detail of the player's layout engine. Exposing it as a peer dep forces users to understand what pretext is and install it, breaking the goal of `npm install @asciify/player` just working.
**Instead:** Bundle pretext inside the player dist. tsup handles this automatically.

### Anti-Pattern 3: Running `next dev` from repo root
**What:** Running the Next.js dev server from the workspace root instead of from `apps/web/`.
**Why bad:** Next.js looks for `src/app/` relative to cwd. Running from the wrong directory produces confusing errors.
**Instead:** Use `pnpm --filter web dev` which runs the dev script scoped to `apps/web/`. Document this in a root-level dev script in `package.json` for convenience: `"dev": "turbo run dev --filter=web"`.

### Anti-Pattern 4: Using Light DOM for the Web Component
**What:** Appending the canvas directly to `this` (no shadow root).
**Why bad:** External stylesheets could affect canvas sizing. The creative-coder target audience often embeds on arbitrary sites with opinionated global CSS.
**Instead:** Always `attachShadow({ mode: 'open' })`. Set all internal styles via a `<style>` element in the shadow root. The host page can still control external dimensions via the custom element's width/height attributes or CSS on the element itself (the shadow boundary does not prevent size styling from the outside).

### Anti-Pattern 5: Calling convertFrameToAscii inside @asciify/player
**What:** Having the player accept raw `ImageData` and run conversion internally.
**Why bad:** This couples rendering to encoding. Users embedding a pre-rendered animation JSON file would still pull in canvas conversion code. It also prevents encoder-side optimizations (workers, batching) from being controlled by the host app.
**Instead:** The player's only input is `AsciiPlayerData`. Conversion is exclusively the encoder's responsibility, orchestrated by `apps/web`.

---

## Scalability Considerations

| Concern | Current (single app) | After monorepo extraction |
|---------|---------------------|---------------------------|
| Package build time | N/A — bundled by Next.js | tsup incremental; Turborepo caches by input hash |
| Type checking | Single `tsc` pass | Each package checked independently; `apps/web` checks against package `.d.ts` |
| Dependency updates | Single `package-lock.json` | `pnpm-lock.yaml` covers all workspaces; `pnpm update --recursive` |
| Publishing | N/A | Each package has independent `version`; changesets for coordinated releases |
| Player bundle size | N/A | pretext is ~30-50 KB minified (estimate); acceptable for a canvas player |

---

## Sources

- Direct source analysis: `src/lib/ascii-engine.ts`, `src/lib/pretext-renderer.ts`, `src/lib/html-export.ts`, `src/lib/delta-encoder.ts`, `src/lib/constants.ts`, `src/lib/measure-char.ts`
- `node_modules/@chenglou/pretext/package.json` — confirmed ESM-only, version 0.0.3, exports `prepare`, `prepareWithSegments`, `layoutWithLines`
- `node_modules/@chenglou/pretext/dist/layout.d.ts` — confirmed API surface
- `.planning/PROJECT.md` — constraints and key decisions
- `.planning/codebase/ARCHITECTURE.md` — existing layering, data flow, abstractions
- `.planning/codebase/STRUCTURE.md` — file locations and naming conventions
- Turborepo conventions: `dependsOn: ["^build"]` task ordering, workspace protocol — HIGH confidence from established ecosystem patterns
- tsup bundling behavior (bundle: true default, devDependencies not included in peer resolution) — HIGH confidence from tsup documentation conventions
