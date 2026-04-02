# Technology Stack

**Project:** asciify monorepo migration
**Researched:** 2026-04-02
**Scope:** pnpm + Turborepo monorepo with two publishable TypeScript packages built with tsup

---

## Versions (verified from npm registry, 2026-04-02)

| Tool | Version | Source |
|------|---------|--------|
| pnpm | 10.33.0 | npm registry — HIGH confidence |
| turbo | 2.9.3 | npm registry — HIGH confidence |
| tsup | 8.5.1 | npm registry — HIGH confidence |
| TypeScript | 6.0.2 (latest), use ^5 for compatibility | npm registry — HIGH confidence |
| vitest | 4.1.2 | npm registry — HIGH confidence |
| @changesets/cli | 2.30.0 | npm registry — HIGH confidence |
| @swc/core | 1.15.21 | npm registry — HIGH confidence |
| @chenglou/pretext | 0.0.4 | npm registry — HIGH confidence |
| Node.js | ≥18.12 required by pnpm 10 | pnpm package.json engines — HIGH confidence |

---

## Recommended Stack

### Monorepo Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pnpm | 10.33.0 | Package manager + workspace protocol | Strict dependency resolution prevents phantom deps; workspace: protocol links local packages without symlink hacks; significantly faster than npm for installs |
| turbo | 2.9.3 | Task orchestration + caching | Parallelizes build/lint/test across packages; caches outputs by content hash so unchanged packages skip re-build; integrates natively with pnpm workspaces |

### Package Build Tool

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tsup | 8.5.1 | Library bundler for packages | Zero-config ESM + CJS dual output; powered by esbuild (fast) with Rollup for tree-shaking; handles `noExternal` for bundling dependencies like pretext; generates `.d.ts` via TypeScript; most widely adopted TS library build tool in 2025/2026 |

### Publishing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @changesets/cli | 2.30.0 | Versioning + changelog generation | Industry standard for monorepo publishing; tracks which packages changed and by what semver bump; integrates with pnpm; produces per-package changelogs |

### Testing (for packages)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vitest | 4.1.2 | Unit testing | Fastest test runner for TS; native ESM support (no jest transform config); built-in browser test mode for canvas/Web API testing; shares vite config with workspace |

### Supporting Dev Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @swc/core | 1.15.21 | Optional tsup transpiler | If TypeScript compilation during tsup is slow, tsup can use SWC instead of esbuild's built-in TypeScript stripping; install as optional devDependency |
| TypeScript | ^5 (keep existing) | Type checking | Project already on TS 5.x; upgrading to TS 6 can wait until Next.js 16 confirms support — do not upgrade yet |

---

## Monorepo Directory Structure

```
asciify/                          # repo root
├── apps/
│   └── web/                      # existing Next.js app (moved from root)
│       ├── src/
│       ├── package.json          # name: "@asciify/web"
│       ├── next.config.ts
│       ├── tsconfig.json         # extends ../../tsconfig.base.json
│       └── ...
├── packages/
│   ├── encoder/                  # @asciify/encoder
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json         # extends ../../tsconfig.base.json
│   │   └── tsup.config.ts
│   └── player/                   # @asciify/player
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json         # extends ../../tsconfig.base.json
│       └── tsup.config.ts
├── tsconfig.base.json            # shared base TS config
├── pnpm-workspace.yaml           # workspace definition
├── turbo.json                    # task pipeline
├── package.json                  # root (private: true, devDeps only)
└── .npmrc                        # pnpm settings
```

---

## Configuration Files

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Why: Simple glob-based workspace definition. `apps/*` holds deployable applications, `packages/*` holds publishable libraries. This is the standard pnpm convention and what Turborepo's own scaffolding generates.

### .npmrc (root)

```ini
# Prevent phantom dependencies — packages can only import what they declare
strict-peer-dependencies=false
auto-install-peers=true
# Hoist only specific packages needed by tooling (e.g., TypeScript, eslint)
# Do NOT use shamefully-hoist=true — defeats pnpm's strict isolation
```

Why: `strict-peer-dependencies=false` avoids excessive install warnings during migration when peer dep versions between packages may temporarily mismatch. `shamefully-hoist=true` (which some guides suggest) defeats pnpm's entire purpose — avoid it.

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

Key points:
- `"dependsOn": ["^build"]` means "build all upstream packages first" — essential so `@asciify/encoder` and `@asciify/player` are compiled before `apps/web` can import them
- `"persistent": true` for dev prevents Turborepo from treating it as a one-shot task
- `"cache": false` for dev because watch mode output is not cacheable
- `"outputs": ["dist/**"]` tells Turborepo what to cache — omitting this means no caching

### tsconfig.base.json (root)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

Why `ES2020` target: Both packages target browsers that already support ES modules (custom elements require modern browsers anyway). `ES2020` gives `Promise.allSettled`, `BigInt`, `globalThis` — all safe targets for 2026 browser baselines without needing Babel transforms.

Why `"lib": ["DOM"]`: Both packages are browser-only. Including DOM types at the base level is correct since every package in this repo targets the browser.

---

## Package: @asciify/encoder

### package.json

```json
{
  "name": "@asciify/encoder",
  "version": "0.1.0",
  "description": "Browser ASCII conversion engine",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^5"
  }
}
```

### tsup.config.ts for encoder

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  platform: 'browser',
  dts: true,
  sourcemap: true,
  clean: true,
  // No external deps — encoder has no runtime dependencies
  // Tree-shake aggressively
  treeshake: true,
})
```

Why `format: ['esm', 'cjs']`: Modern bundlers (Next.js/Vite) use ESM; legacy tools need CJS. Both outputs are generated by tsup from a single source. This is the standard recommendation for publishable packages.

Why `platform: 'browser'`: Prevents tsup/esbuild from including Node.js built-in shims. Encoder uses Canvas 2D API, ImageData, Web Workers — all browser-only. This aligns with the explicit constraint from PROJECT.md.

---

## Package: @asciify/player

### package.json

```json
{
  "name": "@asciify/player",
  "version": "0.1.0",
  "description": "ASCII canvas text animation engine — Web Component + ESM",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./element": {
      "import": "./dist/element.js",
      "types": "./dist/element.d.ts"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@chenglou/pretext": "0.0.4"
  },
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^5"
  }
}
```

Why `"./element"` export: Allows tree-shakeable import of just the Web Component definition (`import '@asciify/player/element'`) for users who only want the custom element without the programmatic API. This is a common pattern for Web Component libraries.

### tsup.config.ts for player

```typescript
import { defineConfig } from 'tsup'

export default defineConfig([
  // Main ESM + CJS bundle (programmatic API)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    target: 'es2020',
    platform: 'browser',
    dts: true,
    sourcemap: true,
    clean: true,
    // Bundle pretext — it is NOT a peer dep, it is an implementation detail
    noExternal: ['@chenglou/pretext'],
    treeshake: true,
  },
  // Web Component element (ESM-only — custom elements don't need CJS)
  {
    entry: ['src/element.ts'],
    format: ['esm'],
    target: 'es2020',
    platform: 'browser',
    dts: true,
    sourcemap: true,
    noExternal: ['@chenglou/pretext'],
    treeshake: true,
  },
])
```

### Why `noExternal: ['@chenglou/pretext']`

This is the critical configuration for bundling pretext. By default, tsup marks all `dependencies` as external (not bundled). `noExternal` overrides this for specific packages, forcing them to be inlined into the output bundle.

Rationale from PROJECT.md: "Bundle pretext inside @asciify/player — users shouldn't need to know about pretext internals; `npm install @asciify/player` should just work."

Why this is safe: `@chenglou/pretext` 0.0.4 has zero dependencies of its own (verified from npm registry). It is MIT licensed. It ships as a pure ESM module (`"type": "module"`). Bundling it creates no transitive dependency issues.

Why NOT a peer dependency: Peer deps require users to install the dep themselves and keep it version-compatible. Since pretext is an internal layout engine (not a framework users would interact with), making it a peer dep would expose implementation details and create unnecessary install friction.

---

## Next.js App Integration (apps/web)

### How workspace packages are consumed

After migrating to pnpm workspaces, `apps/web/package.json` declares:

```json
{
  "dependencies": {
    "@asciify/encoder": "workspace:*",
    "@asciify/player": "workspace:*"
  }
}
```

`workspace:*` resolves to the local package and is replaced with the actual version on `pnpm publish`.

### Whether transpilePackages is needed

Since `@asciify/encoder` and `@asciify/player` are pre-built by tsup (producing compiled `.js` + `.d.ts`), Next.js treats them as regular node_modules — no `transpilePackages` needed. This is the preferred pattern: pre-built packages work without any Next.js config changes.

If packages shipped TypeScript source instead of compiled output, `transpilePackages` would be required. Pre-building avoids this complexity.

### next.config.ts consideration

No changes required for package consumption. The existing minimal config is sufficient.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Package manager | pnpm 10 | npm workspaces | npm workspaces allow phantom deps (can import unhoisted packages accidentally); slower installs; no workspace: protocol replacement on publish |
| Package manager | pnpm 10 | Yarn Berry (PnP) | Yarn PnP's plug-and-play breaks many tools that assume node_modules exists; requires `.pnp.cjs` loader everywhere; poor ecosystem compatibility in 2026 |
| Build orchestrator | Turborepo | Nx | Nx is more powerful but significantly more complex; requires code generators, project.json configs per package, Nx-specific conventions; overkill for a 3-package monorepo |
| Build orchestrator | Turborepo | Lerna | Lerna was deprecated, then revived by Nx team but is Turborepo under the hood for task running now; no advantage over using Turborepo directly |
| Library bundler | tsup | Rollup (direct) | tsup is a tsup abstraction over rollup + esbuild; same output quality with dramatically less config; rollup direct config becomes verbose for dual-format builds |
| Library bundler | tsup | unbuild | unbuild (by Nuxt team) is good but less ecosystem adoption; fewer examples for Web Component output; tsup has wider documentation coverage |
| Library bundler | tsup | Vite lib mode | Vite lib mode works but is primarily designed for apps; hot reload behavior, plugin ecosystem, and config shape differ from what library authoring needs; tsup is purpose-built for libraries |
| Versioning | @changesets/cli | semantic-release | semantic-release requires commit convention enforcement across team; changesets is PR-flow based (change files) which is more ergonomic for solo/small team; manual control over version bumps |
| Testing | vitest | jest | Jest requires transform config for ESM; native ESM + browser environment support in vitest is first-class without config; Canvas/DOM testing works with `@vitest/browser` |
| TypeScript | ^5 (keep) | TypeScript 6 | TS 6 is latest but Next.js 16 compatibility untested; conservative pin avoids surprise build breaks; can upgrade after confirming Next.js support |

---

## Installation

### Root devDependencies (root package.json, private: true)

```bash
pnpm add -Dw turbo @changesets/cli typescript eslint
```

### Per-package devDependencies

```bash
# In packages/encoder and packages/player
pnpm add -D tsup typescript
```

### Per-package runtime dependency (player only)

```bash
# In packages/player
pnpm add @chenglou/pretext@0.0.4
```

### Migration from npm to pnpm

```bash
# Remove npm lockfile
rm package-lock.json

# Install pnpm (via corepack, preserves version pinning)
corepack enable
corepack prepare pnpm@10.33.0 --activate

# Generate pnpm lockfile from existing package.json
pnpm install
```

Why corepack: Ensures everyone on the team (and CI) uses the same pnpm version. Add `"packageManager": "pnpm@10.33.0"` to root package.json to enforce this.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| pnpm version (10.33.0) | HIGH | Verified from npm registry |
| Turborepo version (2.9.3) | HIGH | Verified from npm registry |
| tsup version (8.5.1) | HIGH | Verified from npm registry |
| tsup `noExternal` for pretext | HIGH | Documented tsup API, verified pretext has no deps |
| `platform: 'browser'` in tsup | HIGH | Verified from tsup package — esbuild platform option passed through |
| `workspace:*` pnpm protocol | HIGH | Standard pnpm workspace feature, replaced on publish |
| No `transpilePackages` needed for pre-built packages | HIGH | Verified from Next.js 16 docs — pre-built node_modules don't need transpilation |
| @chenglou/pretext 0.0.4 is ESM-only, zero deps | HIGH | Verified from npm registry metadata |
| @changesets/cli 2.30.0 | HIGH | Verified from npm registry |
| vitest 4.1.2 | HIGH | Verified from npm registry |
| TypeScript 6.0.2 exists but keep ^5 | HIGH | Verified from npm registry + risk assessment |
| Turborepo `^build` dependency syntax | MEDIUM | Based on Turborepo documentation patterns; syntax stable across 2.x but not re-verified against 2.9.3 changelog |
| Web Component separate `./element` export pattern | MEDIUM | Common pattern in Web Component libraries but specific to design choice, not a tooling requirement |

---

## Sources

- npm registry: `npm info pnpm`, `npm info turbo`, `npm info tsup`, `npm info @chenglou/pretext`, `npm info vitest`, `npm info @changesets/cli`, `npm info @swc/core`
- Next.js 16 docs (local): `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md`
- Next.js 16 docs (local): `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md`
- PROJECT.md constraints: `@asciify/player` bundles pretext, browser-only, pnpm + Turborepo + tsup chosen
- Existing codebase STACK.md: Current Node.js 24, npm, Next.js 16.2.1, TypeScript ^5

---

*Researched: 2026-04-02 | Verified from npm registry*
