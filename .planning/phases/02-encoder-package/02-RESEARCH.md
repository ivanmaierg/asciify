# Phase 02: Encoder Package - Research

**Researched:** 2026-04-02
**Domain:** TypeScript package extraction, tsup build tooling, vitest unit testing, monorepo workspace integration
**Confidence:** HIGH

## Summary

Phase 2 extracts the ASCII conversion engine from `apps/web/src/lib/` into a standalone `@asciify/encoder` npm package. The source code already exists and is well-isolated — three files (`ascii-engine.ts`, `delta-encoder.ts`, `rle.ts`) plus a split of `constants.ts` move directly to `packages/encoder/src/`. The package shell from Phase 1 already has a `package.json`, `tsconfig.json`, and empty `src/index.ts`.

The two main engineering efforts are: (1) wiring tsup to produce ESM + CJS + type declarations from the extracted sources, and (2) refactoring the `convertFrameToAscii` signature to the options-object pattern decided in D-01. A third stream defines the `AsciiPlayerData` canonical format (D-04/D-05) and exports `createPlayerData`/`compressPlayerData` serializers.

After the package builds, five files in `apps/web` update their import paths from `@/lib/*` to `@asciify/encoder`. The worker (`ascii-worker.ts`) is the trickiest because it contains a hand-inlined copy of the conversion logic as a string blob; the decision (D-08) is to keep the worker in the app, so only the TypeScript types at the top of that file need to change, not the inlined string.

**Primary recommendation:** Move files first, wire tsup second, refactor API third — this order surfaces import issues early and keeps each step independently verifiable.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `convertFrameToAscii(imageData, options)` — options object pattern instead of 10 positional params. `ConvertOptions` interface with all conversion parameters.
- **D-02:** All `ConvertOptions` fields have sensible defaults except `columns` and `charset` (required). Defaults match current `DEFAULT_SETTINGS` (gamma=1, ditherMode='none', colorMode='monochrome', etc.).
- **D-03:** Full export surface: core conversion function, compression utilities (`deltaEncode`, `rleEncode`, `rleDecode`), character set presets (`CHARACTER_SETS`, `DEFAULT_SETTINGS`), all types (`AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`, `ConvertOptions`, `DeltaPatch`, `EncodedFrame`), and canonical format helpers (`createPlayerData`, `compressPlayerData`).
- **D-04:** `AsciiPlayerData` spec with `version` (number), `metadata` (columns, rows, fps, duration, frameCount, colorMode, charset), and `frames[]` (array of `AsciiFrame`). Self-contained — everything needed to play back without the original video.
- **D-05:** Two-layer format: `AsciiPlayerData` (clean, uncompressed) as the canonical spec, plus `AsciiPlayerDataCompact` with delta+RLE compressed frames for production use. Encoder exports `createPlayerData()` and `compressPlayerData()` serializers.
- **D-06:** Split `constants.ts` — encoder-relevant types and presets (ColorMode, DitherMode, CHARACTER_SETS, conversion defaults) move to `packages/encoder/src/`. App-only types (PlaybackState, ExportFormat, ExportLoop) stay in `apps/web`. App imports encoder types from `@asciify/encoder`.
- **D-07:** Move files directly from `apps/web/src/lib/` to `packages/encoder/src/` (ascii-engine.ts, delta-encoder.ts, rle.ts). Update `apps/web` imports to `@asciify/encoder`. One source of truth.
- **D-08:** `ascii-worker.ts` stays in `apps/web` — worker orchestration is app responsibility per project constraints. Worker imports conversion function from `@asciify/encoder`.
- **D-09:** Assertion-based testing with vitest. Test each color mode, each dither algorithm, RLE round-trips, delta encoding patches. Deterministic and fast.
- **D-10:** Synthetic `ImageData` objects in tests — plain `{ width, height, data: Uint8ClampedArray }`. No browser environment needed; the conversion function only reads these properties.

### Claude's Discretion

- Internal file organization within `packages/encoder/src/` (single file vs multiple modules)
- tsup configuration details (entry points, externals, output formats)
- Exact default values for ConvertOptions (should mirror current DEFAULT_SETTINGS)
- vitest configuration and test file organization
- Whether to add a `validate()` function for AsciiPlayerData

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENC-01 | `@asciify/encoder` package created with tsup build (ESM + CJS + types) | tsup Standard Stack section; package.json exports map pattern |
| ENC-02 | `convertFrameToAscii(imageData, options): AsciiFrame` exported as core function | API Refactor pattern; options object signature design |
| ENC-03 | All types exported: `AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode` | Source analysis; index.ts barrel pattern |
| ENC-04 | Multi-pass pipeline preserved: gamma, Sobel, Floyd-Steinberg, Bayer | Source code confirmed in ascii-engine.ts; move-only, no rewrite |
| ENC-05 | Brightness threshold and contrast boost parameters supported | Confirmed in ascii-engine.ts fast-path and multi-pass both handle these |
| ENC-06 | `deltaEncode` and `rleEncode` compression utilities exported | delta-encoder.ts + rle.ts confirmed self-contained; move-only |
| ENC-07 | Canonical JSON data format spec defined (`AsciiPlayerData`) | New types + serializer functions; AsciiPlayerData/AsciiPlayerDataCompact design |
| ENC-08 | `apps/web` imports encoder from `@asciify/encoder` instead of local source | Import update map section; worker special case documented |
| TEST-01 | Unit tests for encoder — all conversion functions, edge cases, color modes, dithering (vitest) | vitest workspace config; synthetic ImageData approach; test coverage map |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | 8.5.1 | Bundle TypeScript to ESM + CJS + .d.ts | Zero-config, wraps esbuild, monorepo standard |
| vitest | 4.1.2 | Unit testing framework | Vite-native, fast, no browser required for pure TS |
| typescript | ^5 | Already in devDeps | Already specified |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/coverage-v8 | 4.1.2 | Coverage reports | Optional, same version as vitest |

### Version Verification

Verified against npm registry on 2026-04-02:
- `tsup`: 8.5.1 (current)
- `vitest`: 4.1.2 (current)
- `@vitest/coverage-v8`: 4.1.2 (current)

**Installation (run from `packages/encoder/`):**
```bash
pnpm add -D tsup vitest
```

**Or add to packages/encoder/package.json devDependencies directly** and run `pnpm install` from root (workspace will resolve).

---

## Architecture Patterns

### Recommended Package Structure

```
packages/encoder/
├── src/
│   ├── index.ts          # Barrel — all public exports
│   ├── ascii-engine.ts   # Moved from apps/web (with API refactor)
│   ├── delta-encoder.ts  # Moved from apps/web (no changes)
│   ├── rle.ts            # Moved from apps/web (no changes)
│   ├── constants.ts      # Encoder-only slice of apps/web constants.ts
│   └── player-data.ts    # New: AsciiPlayerData types + serializers
├── tests/
│   ├── ascii-engine.test.ts
│   ├── delta-encoder.test.ts
│   ├── rle.test.ts
│   └── player-data.test.ts
├── package.json          # Updated with tsup, vitest, build/test scripts
├── tsconfig.json         # No changes needed
└── tsup.config.ts        # New: build config
```

### Pattern 1: tsup Configuration for Dual Package (ESM + CJS + types)

**What:** `tsup.config.ts` in the package root configures entry points, output formats, and type generation.

**When to use:** All publishable packages in this monorepo.

```typescript
// packages/encoder/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

### Pattern 2: package.json exports map (CJS + ESM dual package)

**What:** The `exports` field in package.json routes `require()` to CJS and `import` to ESM. The `main` and `module` fields are legacy fallbacks. The `types` field and `exports["types"]` serve TypeScript.

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rm -rf dist"
  }
}
```

**Critical:** Remove `"main": "./src/index.ts"` (the Phase 1 dev-only stub) and replace with the dist paths above. The current `main` pointing at source only works when consumed by Next.js with ts-paths — it will break as a proper publishable package.

### Pattern 3: ConvertOptions API Refactor (D-01)

**What:** Replace the 10-positional-param signature with an options object. All callers updated accordingly.

```typescript
// packages/encoder/src/ascii-engine.ts
export interface ConvertOptions {
  columns: number           // REQUIRED
  charset: string           // REQUIRED
  brightnessThreshold?: number  // default: 0
  contrastBoost?: number        // default: 100
  colorMode?: ColorMode         // default: 'monochrome'
  gamma?: number                // default: 1.0
  edgeDetection?: number        // default: 0
  ditherMode?: DitherMode       // default: 'none'
  invertCharset?: boolean       // default: false
}

export function convertFrameToAscii(
  imageData: ImageData | { width: number; height: number; data: Uint8ClampedArray },
  options: ConvertOptions,
): AsciiFrame {
  const {
    columns,
    charset,
    brightnessThreshold = 0,
    contrastBoost = 100,
    colorMode = 'monochrome',
    gamma = 1.0,
    edgeDetection = 0,
    ditherMode = 'none',
    invertCharset = false,
  } = options
  // ... rest unchanged
}
```

**Note on ImageData type:** The function only reads `width`, `height`, `data` from the `imageData` argument — it never calls browser-only methods. Accepting `{ width, height, data: Uint8ClampedArray }` as structural type allows tests to pass plain objects without a browser DOM. This is the D-10 approach.

### Pattern 4: AsciiPlayerData Canonical Format (D-04/D-05)

**What:** Two interfaces: uncompressed `AsciiPlayerData` and production `AsciiPlayerDataCompact`.

```typescript
// packages/encoder/src/player-data.ts

export interface AsciiPlayerMetadata {
  columns: number
  rows: number
  fps: number
  duration: number
  frameCount: number
  colorMode: ColorMode
  charset: string
}

export interface AsciiPlayerData {
  version: 1
  metadata: AsciiPlayerMetadata
  frames: AsciiFrame[]
}

export interface AsciiPlayerDataCompact {
  version: 1
  metadata: AsciiPlayerMetadata
  frames: EncodedFrame[]   // delta+RLE compressed
}

export function createPlayerData(
  frames: AsciiFrame[],
  metadata: Omit<AsciiPlayerMetadata, 'frameCount' | 'rows'>,
): AsciiPlayerData {
  const rows = frames[0]?.cells.length ?? 0
  return {
    version: 1,
    metadata: { ...metadata, frameCount: frames.length, rows },
    frames,
  }
}

export function compressPlayerData(
  data: AsciiPlayerData,
  keyframeInterval = 10,
): AsciiPlayerDataCompact {
  const rawTexts = data.frames.map((f) => f.text)
  const { frames } = deltaEncode(rawTexts, keyframeInterval)
  return {
    version: 1,
    metadata: data.metadata,
    frames,
  }
}
```

### Pattern 5: vitest Workspace Config (monorepo-style per-package)

**What:** Each package runs its own vitest config. The root `turbo.json` already has a `test` task. The encoder package gets its own `vitest.config.ts`.

```typescript
// packages/encoder/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',   // No browser DOM needed (D-10)
    include: ['tests/**/*.test.ts'],
  },
})
```

**Run command:** `pnpm --filter @asciify/encoder test` or `turbo run test --filter=@asciify/encoder`.

### Pattern 6: Synthetic ImageData in Tests (D-10)

**What:** Create fake ImageData objects for testing without jsdom or browser.

```typescript
// packages/encoder/tests/ascii-engine.test.ts
import { describe, it, expect } from 'vitest'
import { convertFrameToAscii } from '../src/ascii-engine'

function makeImageData(w: number, h: number, fill: number = 128) {
  const data = new Uint8ClampedArray(w * h * 4).fill(fill)
  return { width: w, height: h, data }
}

describe('convertFrameToAscii', () => {
  it('returns correct dimensions for monochrome', () => {
    const img = makeImageData(80, 40)
    const frame = convertFrameToAscii(img, { columns: 10, charset: ' .:-=+*#%@' })
    expect(frame.cells.length).toBeGreaterThan(0)
    expect(frame.cells[0].length).toBe(10)
  })
})
```

### Anti-Patterns to Avoid

- **Keeping `"main": "./src/index.ts"` in package.json:** This only works inside the monorepo via TypeScript paths. A published package needs dist paths. Swap before running `build`.
- **Importing `@/lib/*` in encoder source:** The `@/` alias is `apps/web`-specific. After moving to `packages/encoder/src/`, all imports within encoder must use relative paths (`./rle`, `./constants`) or `@encoder/*` if the encoder's own tsconfig alias is used.
- **Using `ImageData` as a strict type in test:** `ImageData` is a browser global — it won't exist in `environment: 'node'`. Accept the structural shape instead (see Pattern 3).
- **Putting worker-code string imports in encoder:** `ascii-worker.ts` keeps its inline string blob in `apps/web` (D-08). Only the TypeScript type imports at the top of that file change.
- **Forgetting to update `apps/web` tsconfig paths:** After moving, the `@/lib/ascii-engine` and `@/lib/constants` paths still exist (for app-only things like `PlaybackState`). Do not remove the `@/*` alias from `apps/web/tsconfig.json` — just update individual import paths in affected files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual package output | Custom rollup config | tsup | tsup wraps esbuild, handles ESM/CJS/dts in one command |
| `.d.ts` generation | Manual type stubs | tsup `dts: true` | Generates declaration maps, handles re-exports |
| Test runner | Custom node:test harness | vitest | Watch mode, snapshot, coverage built-in |
| Package validation | Manual `exports` checking | publint (Phase 6) | Reserved for Phase 6 — don't add now |

**Key insight:** The source code needs no algorithmic changes — only the function signature (options object) and import paths change. The compilation/bundling complexity is handled entirely by tsup with ~10 lines of config.

---

## Common Pitfalls

### Pitfall 1: `ascii-worker.ts` inlined code not updated

**What goes wrong:** The worker runs its own copy of the conversion algorithm as an inlined string. Even after `apps/web` updates its TypeScript imports, the inlined JS string inside `ascii-worker.ts` remains duplicated and diverges.

**Why it happens:** The worker cannot `import` from `@asciify/encoder` at runtime because it runs in a separate thread without a module bundler. The current implementation inlines the algorithm as a plain JS string for this reason.

**How to avoid:** Per D-08, the inlined string stays as-is. Only update the TypeScript-level imports at the top of `ascii-worker.ts` (the `AsciiFrame` and `ColorMode`/`DitherMode` type imports). The algorithm duplication is intentional — document this in a comment.

**Warning signs:** If tests start failing on worker output but encoder unit tests pass, the inlined string is stale.

### Pitfall 2: `@/` alias resolution breaks in encoder package source

**What goes wrong:** `ascii-engine.ts` currently imports `import type { ColorMode, DitherMode } from '@/lib/constants'`. After moving to `packages/encoder/src/`, that alias no longer resolves.

**Why it happens:** `@/` maps to `apps/web/src/` via that app's tsconfig. The encoder package has a different tsconfig (`@encoder/*` maps to `./src/*`).

**How to avoid:** Replace `@/lib/constants` with `./constants` (relative) after moving. Similarly, `delta-encoder.ts` imports `@/lib/rle` — change to `./rle`.

**Warning signs:** TypeScript errors: "Cannot find module '@/lib/constants'" during `pnpm typecheck`.

### Pitfall 3: `constants.ts` split leaves app with broken imports

**What goes wrong:** `apps/web/src/stores/editor-store.ts` and `apps/web/src/lib/frame-extractor.ts` currently import `ColorMode`, `DitherMode`, `DEFAULT_SETTINGS` from `@/lib/constants`. After the split, those types move to `@asciify/encoder`. If the split removes them from `apps/web/src/lib/constants.ts` without updating all callers, the app breaks.

**Why it happens:** `constants.ts` is imported in at least 5 places in `apps/web`. Not all of them import encoder-only types — some import app-only types (`PlaybackState`, `ExportLoop`, `ExportFormat`) that stay.

**How to avoid:** Keep `apps/web/src/lib/constants.ts` as the residual file with only app-only types. Add re-exports of encoder types from `@asciify/encoder` to ease migration, OR update each `apps/web` file to import from `@asciify/encoder` directly. The latter is cleaner (one source of truth) and is what D-07 prescribes.

**Warning signs:** TypeScript errors on app build; `editor-store.ts` or `frame-extractor.ts` failing typecheck.

### Pitfall 4: `package.json` `main` field pointing at `src/index.ts`

**What goes wrong:** The Phase 1 shell set `"main": "./src/index.ts"` as a placeholder. This works in the monorepo when Next.js's TypeScript resolution follows the path, but tsup will output to `dist/`. If `main` is not updated before publishing, consumers get the raw TypeScript source, not compiled JS.

**Why it happens:** The placeholder was intentional for Phase 1 but was always meant to be replaced in Phase 2.

**How to avoid:** Update `package.json` in the same task that adds tsup (see Pattern 2 exports map above). Verify with `node -e "require('@asciify/encoder')"` from `apps/web` after build.

**Warning signs:** Import works in monorepo (TypeScript resolves source) but would fail for external consumers.

### Pitfall 5: vitest `environment: 'node'` vs `ImageData` global

**What goes wrong:** `ImageData` is a browser DOM API. Code that calls `new ImageData(...)` will throw `ReferenceError: ImageData is not defined` in a Node test environment.

**Why it happens:** The encoder never calls `new ImageData()` — it only reads `width`, `height`, `data`. But if any import chain accidentally brings in a browser-only constructor, tests fail.

**How to avoid:** Keep the structural type approach from D-10. Do not call `new ImageData()` in tests. Use `makeImageData()` helper returning a plain object. Verify: `typeof globalThis.ImageData === 'undefined'` is OK because the function signature accepts the structural shape.

---

## Code Examples

### tsup.config.ts (verified pattern)

```typescript
// packages/encoder/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // No `external` needed — encoder has no runtime dependencies
})
```

### index.ts barrel (complete export surface per D-03)

```typescript
// packages/encoder/src/index.ts
export { convertFrameToAscii } from './ascii-engine'
export type { AsciiFrame, AsciiCell, ConvertOptions } from './ascii-engine'
export { deltaEncode } from './delta-encoder'
export type { DeltaPatch, EncodedFrame, DeltaEncodedFrames } from './delta-encoder'
export { rleEncode, rleDecode } from './rle'
export { CHARACTER_SETS, DEFAULT_SETTINGS } from './constants'
export type { ColorMode, DitherMode, CharacterSetName } from './constants'
export { createPlayerData, compressPlayerData } from './player-data'
export type { AsciiPlayerData, AsciiPlayerDataCompact, AsciiPlayerMetadata } from './player-data'
```

### Import update examples for apps/web files

```typescript
// apps/web/src/lib/ascii-worker.ts — type imports only change
import type { AsciiFrame } from '@asciify/encoder'
import type { ColorMode, DitherMode } from '@asciify/encoder'
// The inlined WORKER_CODE string stays unchanged

// apps/web/src/lib/html-export.ts
import type { EncodedFrame } from '@asciify/encoder'
import type { ExportLoop, ColorMode } from '@asciify/encoder'  // ColorMode moves
// ExportLoop stays in apps/web/src/lib/constants.ts (app-only type)

// apps/web/src/lib/frame-extractor.ts
import type { AsciiFrame } from '@asciify/encoder'
import { CHARACTER_SETS } from '@asciify/encoder'
import type { CharacterSetName, ColorMode, DitherMode } from '@asciify/encoder'

// apps/web/src/stores/editor-store.ts
import {
  type ColorMode,
  type DitherMode,
  DEFAULT_SETTINGS,
} from '@asciify/encoder'
import {
  type ExportFormat,
  type ExportLoop,
  type PlaybackState,
} from '@/lib/constants'   // app-only types remain here
```

### RLE round-trip test example

```typescript
// packages/encoder/tests/rle.test.ts
import { describe, it, expect } from 'vitest'
import { rleEncode, rleDecode } from '../src/rle'

describe('rle', () => {
  it('round-trips arbitrary strings', () => {
    const input = 'aaabbbccc   ...---'
    expect(rleDecode(rleEncode(input))).toBe(input)
  })
  it('does not encode runs shorter than 3', () => {
    expect(rleEncode('ab')).toBe('ab')
    expect(rleEncode('aab')).toBe('aab')
  })
  it('encodes runs of 3+', () => {
    expect(rleEncode('aaa')).toBe('~3~a')
  })
})
```

---

## Runtime State Inventory

> Section omitted — this is a greenfield package extraction phase, not a rename/migration phase. No runtime state carries the old module paths.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest, tsup | ✓ | 24.x (per .nvmrc) | — |
| pnpm | workspace installs | ✓ | 10.33.0 (corepack) | — |
| TypeScript | tsup, tsc | ✓ | ^5 (in devDeps) | — |
| tsup | build | ✗ (not yet installed) | — | Add to devDeps |
| vitest | testing | ✗ (not yet installed) | — | Add to devDeps |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- tsup, vitest — not yet in `packages/encoder/package.json`; added in Wave 0 setup task before any build or test task runs.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `packages/encoder/vitest.config.ts` — Wave 0 creates this |
| Quick run command | `pnpm --filter @asciify/encoder test` |
| Full suite command | `turbo run test --filter=@asciify/encoder` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENC-01 | Package builds to ESM + CJS + types without error | smoke | `pnpm --filter @asciify/encoder build` | ❌ Wave 0 |
| ENC-02 | `convertFrameToAscii(img, opts)` returns `AsciiFrame` with correct shape | unit | `pnpm --filter @asciify/encoder test -- tests/ascii-engine.test.ts` | ❌ Wave 0 |
| ENC-03 | All types importable from `@asciify/encoder` (TypeScript compile check) | smoke | `pnpm --filter @asciify/encoder typecheck` | ❌ Wave 0 |
| ENC-04 | Each color mode (monochrome, colored, inverted, monoscale) returns non-empty output | unit | same as ENC-02 | ❌ Wave 0 |
| ENC-04 | Each dither mode (none, floyd-steinberg, ordered) + edge detection produces output | unit | same as ENC-02 | ❌ Wave 0 |
| ENC-05 | brightnessThreshold=255 produces all-empty chars; contrastBoost=100 round-trips | unit | same as ENC-02 | ❌ Wave 0 |
| ENC-06 | RLE round-trip; deltaEncode produces shorter output for repetitive frames | unit | `pnpm --filter @asciify/encoder test -- tests/rle.test.ts tests/delta-encoder.test.ts` | ❌ Wave 0 |
| ENC-07 | `createPlayerData` returns valid AsciiPlayerData; `compressPlayerData` round-trips | unit | `pnpm --filter @asciify/encoder test -- tests/player-data.test.ts` | ❌ Wave 0 |
| ENC-08 | `apps/web` typechecks with updated imports | smoke | `pnpm --filter web typecheck` | ❌ (updated in phase) |
| TEST-01 | All test files pass | unit | `pnpm --filter @asciify/encoder test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @asciify/encoder test`
- **Per wave merge:** `pnpm --filter @asciify/encoder test && pnpm --filter web typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/encoder/vitest.config.ts` — vitest config for node environment
- [ ] `packages/encoder/tests/ascii-engine.test.ts` — covers ENC-02, ENC-04, ENC-05
- [ ] `packages/encoder/tests/rle.test.ts` — covers ENC-06 (RLE)
- [ ] `packages/encoder/tests/delta-encoder.test.ts` — covers ENC-06 (delta)
- [ ] `packages/encoder/tests/player-data.test.ts` — covers ENC-07
- [ ] Add `tsup` and `vitest` to `packages/encoder/package.json` devDependencies
- [ ] Add `build` and `test` scripts to `packages/encoder/package.json`
- [ ] Run `pnpm install` from root to install new devDeps

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rollup + babel for dual packages | tsup (esbuild-based) | ~2022 | 10-100x faster builds |
| `jest` for TS packages | vitest | ~2022 | Native ESM, no transform config |
| `"main"` only in package.json | `"exports"` map | Node.js 12+ | Enables CJS+ESM dual package |

**Deprecated/outdated:**
- `"main": "./src/index.ts"` (Phase 1 stub): Replace with proper dist paths before running build.
- 10-positional-parameter `convertFrameToAscii`: Replaced by options object per D-01.

---

## Open Questions

1. **`apps/web` workspace dependency declaration**
   - What we know: Phase 1 added `@encoder/*` path alias to `apps/web/tsconfig.json` but `packages/encoder` is not yet listed as a dependency in `apps/web/package.json`
   - What's unclear: Does pnpm workspace resolution pick up `@asciify/encoder` automatically, or does `apps/web/package.json` need `"@asciify/encoder": "workspace:*"`?
   - Recommendation: Add `"@asciify/encoder": "workspace:*"` to `apps/web/package.json` dependencies in the setup task. This is standard pnpm workspace practice.

2. **`apps/web/tsconfig.json` path aliases after split**
   - What we know: Phase 1 added `"@encoder/*": ["../../packages/encoder/src/*"]` to `apps/web/tsconfig.json`
   - What's unclear: After encoding types move to the package, `apps/web` should import from `@asciify/encoder` (the npm package name), not `@encoder/*` (the TS alias). The alias was a Phase 1 forward stub.
   - Recommendation: Keep the `@encoder/*` alias in `apps/web/tsconfig.json` for now — it's harmless. Import using `@asciify/encoder` (the package name) everywhere in code; TypeScript will resolve via the workspace `node_modules` symlink.

3. **`ascii-worker.ts` long-term duplication**
   - What we know: The inlined JS string inside `ascii-worker.ts` duplicates the conversion algorithm. D-08 intentionally keeps this.
   - What's unclear: Future changes to `convertFrameToAscii` will require updating both the encoder source and the inlined worker string. There is no compile-time check to catch drift.
   - Recommendation: Add a code comment in `ascii-worker.ts` noting the duplication is intentional and referencing the version of `ascii-engine.ts` it was synced from. Flag as tech debt for a later phase (e.g., worker module bundling in the app build).

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact on Phase 2 |
|------------|-------------------|
| Browser-only packages | Encoder must not import Node.js built-ins; `tslib`, `fs`, `path` not allowed |
| No worker orchestration in encoder | `ascii-worker.ts` stays in `apps/web` entirely per D-08 |
| Named exports only (no default exports) | All encoder exports are named; `export default` not used |
| `@/*` alias maps to `apps/web/src/` | Encoder internal imports use relative paths (`./rle`) not `@/` |
| pnpm + Turborepo | Use `pnpm add` for installs; Turborepo `test` task already configured |
| TypeScript strict mode | `strict: true` in `tsconfig.base.json`; all encoder code must typecheck strictly |
| Node.js 24 per .nvmrc | tsup 8.5.1 and vitest 4.1.2 both support Node 24 |
| Single quotes, 2-space indent | Match code style in all new files |
| Named exports for functions, explicit type exports | Use `export type { Foo }` syntax for type-only exports |

---

## Sources

### Primary (HIGH confidence)

- Source code analysis: `apps/web/src/lib/ascii-engine.ts`, `delta-encoder.ts`, `rle.ts`, `constants.ts` — read directly
- Source code analysis: `packages/encoder/package.json`, `tsconfig.json`, `src/index.ts` — read directly
- Source code analysis: `turbo.json`, `tsconfig.base.json`, `apps/web/package.json` — read directly
- npm registry: `tsup@8.5.1`, `vitest@4.1.2` — verified via `npm view` on 2026-04-02

### Secondary (MEDIUM confidence)

- tsup documentation pattern: dual package exports map is standard tsup output; dts option for declarations
- vitest documentation: `environment: 'node'` for non-browser packages; per-package config files standard in monorepos

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry directly
- Architecture: HIGH — derived from reading actual source files; no guessing about existing code shape
- Pitfalls: HIGH — all five pitfalls are directly traceable to code patterns observed in the source files
- API design: HIGH — locked by user decisions D-01 through D-10; research confirms feasibility against actual code

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (tsup/vitest are stable; unlikely to change in 30 days)
