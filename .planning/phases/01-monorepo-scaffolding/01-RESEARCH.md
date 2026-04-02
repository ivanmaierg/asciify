# Phase 1: Monorepo Scaffolding - Research

**Researched:** 2026-04-02
**Domain:** pnpm workspaces + Turborepo monorepo scaffolding from an existing Next.js app
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Monorepo layout: `apps/web/` (Next.js app), `packages/encoder/` and `packages/player/` (library shells)
- **D-02:** Flat `src/` directory per package — `packages/encoder/src/index.ts`, `packages/player/src/index.ts`. No nested structure.
- **D-03:** Shared types (AsciiFrame, AsciiCell, ColorMode, DitherMode) owned by `@asciify/encoder`. Player imports types from encoder — no separate shared package.
- **D-04:** Clean slate npm → pnpm migration — delete `node_modules/` and `package-lock.json`, run `pnpm install` fresh. Accept that phantom dependency issues surface immediately.
- **D-05:** Brief app downtime acceptable — app can be broken for intermediate commits during restructuring, as long as `pnpm --filter web dev` works at the end of Phase 1.
- **D-06:** Scoped path aliases per package — `@encoder/*` for encoder, `@player/*` for player, `@/*` stays as `./src/*` in `apps/web`. Each package's tsconfig defines its own alias.
- **D-07:** `tsconfig.base.json` at monorepo root with shared strict settings (target, strict mode, moduleResolution). Each package/app extends it and adds own paths/target.
- **D-08:** Turborepo caches `build`, `lint`, and `test` tasks. `dev` task has `cache: false` and `persistent: true`. Pipeline uses `dependsOn: ["^build"]` so packages build before app.

### Claude's Discretion

- ESLint config organization (shared vs per-package)
- Tailwind/PostCSS config placement (likely stays in `apps/web` only since packages are non-visual libraries)
- Exact Turborepo pipeline task definitions beyond build/lint/test/dev
- `.gitignore` updates for pnpm and Turborepo artifacts

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MONO-01 | Project restructured into pnpm workspaces with `apps/web` and `packages/*` layout | pnpm-workspace.yaml + directory restructuring; Step-by-step migration order documented |
| MONO-02 | Turborepo configured with build pipeline (`dependsOn: ["^build"]`) | turbo.json config with correct pipeline; verified schema; outputs globs confirmed |
| MONO-03 | Existing Next.js app runs correctly from `apps/web` after migration | tsconfig paths update; `pnpm --filter web dev` command; import audit confirms no phantom deps |
| MONO-04 | Shared TypeScript base config (`tsconfig.base.json`) used by all packages and app | Base config extracted from current tsconfig.json; per-package extends pattern documented |
| MONO-05 | `npm` replaced with `pnpm` (package-lock.json removed, pnpm-lock.yaml generated) | corepack activation; clean-slate migration steps; `packageManager` field enforcement |
</phase_requirements>

---

## Summary

Phase 1 is a pure repo restructuring with no code extraction. The existing Next.js app at repo root moves to `apps/web/`. Two empty package shells (`packages/encoder/`, `packages/player/`) are created with minimal `package.json`, `tsconfig.json`, and `src/index.ts` stubs. Turborepo and pnpm workspace config is added at the repo root. The phase ends when `pnpm --filter web dev` starts the app with identical behavior to before migration.

The main technical work is threefold: (1) the npm-to-pnpm clean-slate migration, (2) moving all app files into `apps/web/` and updating the tsconfig path alias so `@/*` still resolves correctly from the new location, and (3) splitting the current monolithic `tsconfig.json` into a `tsconfig.base.json` at root plus per-package extends files.

**Primary recommendation:** Execute migration as a sequence of atomic commits (workspace config → app move → pnpm install → verify), not in one large commit. Each step must leave the repo in a known state even if the app is temporarily unrunnable.

---

## Project Constraints (from CLAUDE.md)

The project's CLAUDE.md references AGENTS.md, which contains one critical directive:

> **This version has NOT the Next.js you know.** APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Verified from `node_modules/next/dist/docs/`:** Next.js 16.2.1 is the installed version. Key verified findings:

- `transpilePackages` is only needed for Pages Router (`<PagesOnly>` block in docs). App Router bundles workspace packages automatically when they ship compiled `dist/` — no `transpilePackages` required for this App Router app.
- `serverExternalPackages` is the App Router config to opt packages _out_ of bundling — not needed here.
- No monorepo-specific config required in `next.config.ts` for pre-built workspace packages.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 10.33.0 (latest) | Package manager + workspace protocol | Strict dependency isolation; `workspace:*` protocol; faster than npm |
| turbo | 2.9.3 (latest) | Task orchestration + remote caching | Content-hash caching; parallel task execution; native pnpm workspace support |
| TypeScript | ^5 (keep existing) | Type checking | Project already on ^5; TS 6.0.2 exists but hold until Next.js 16 confirms compat |

Both `pnpm` and `turbo` versions verified from npm registry on 2026-04-02.

**Note on installed pnpm:** The machine has pnpm 9.15.0 installed. The project should use pnpm 10.33.0 via corepack (`corepack prepare pnpm@10.33.0 --activate`). The `packageManager` field in root `package.json` enforces this.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| corepack | 0.34.0 (already installed) | pnpm version pinning | Ensures all contributors and CI use the same pnpm version |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm workspaces | npm workspaces | npm allows phantom deps; no workspace:* replacement on publish |
| Turborepo | Nx | Nx is more powerful but overkill for 3-package monorepo; Turborepo is simpler |

**Installation — root devDependencies:**

```bash
pnpm add -Dw turbo typescript
```

**Activate pnpm 10 via corepack:**

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

---

## Architecture Patterns

### Recommended Project Structure

This is the target state after Phase 1. No code changes — only file moves and new config files.

```
asciify/                               # repo root (workspace root)
├── apps/
│   └── web/                           # entire existing app moved here
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   ├── stores/
│       │   └── types/
│       ├── public/
│       ├── package.json               # name: "web", private: true
│       ├── tsconfig.json              # extends ../../tsconfig.base.json
│       ├── next.config.ts
│       ├── eslint.config.mjs          # stays here — Next.js-specific
│       ├── postcss.config.mjs         # stays here — Tailwind-specific
│       ├── components.json            # stays here — shadcn config
│       └── tailwind.config.ts         # stays here (if exists)
├── packages/
│   ├── encoder/                       # @asciify/encoder (shell only this phase)
│   │   ├── src/
│   │   │   └── index.ts               # stub: export {}
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── player/                        # @asciify/player (shell only this phase)
│       ├── src/
│       │   └── index.ts               # stub: export {}
│       ├── package.json
│       └── tsconfig.json
├── tsconfig.base.json                 # NEW — shared compiler options
├── pnpm-workspace.yaml                # NEW — workspace definition
├── turbo.json                         # NEW — task pipeline
├── package.json                       # MODIFIED — private: true, add turbo devDep
├── pnpm-lock.yaml                     # NEW (generated)
├── .nvmrc                             # stays at root (Node 24)
└── .gitignore                         # MODIFIED — add pnpm/turbo artifacts
```

### Pattern 1: Clean-Slate npm → pnpm Migration

**What:** Delete `node_modules/` and `package-lock.json` before converting to pnpm. Run `pnpm install` fresh from workspace root.

**When to use:** Every npm → pnpm migration where phantom dependency issues should surface immediately (D-04).

**Sequence:**

```bash
# From repo root
rm -rf node_modules package-lock.json tsconfig.tsbuildinfo
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
```

### Pattern 2: tsconfig Inheritance Chain

**What:** Extract common compiler options into `tsconfig.base.json`. Each package and app `tsconfig.json` uses `"extends"` and adds only its own differences.

**Current `tsconfig.json` analysis** (from codebase):

```json
{
  "compilerOptions": {
    "target": "ES2017",          // stays at this level for apps/web (Next.js target)
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,             // Next.js-specific, stays in apps/web tsconfig
    "skipLibCheck": true,        // goes to base
    "strict": true,              // goes to base
    "noEmit": true,              // apps/web only (Next.js doesn't emit)
    "esModuleInterop": true,     // goes to base
    "module": "esnext",          // goes to base
    "moduleResolution": "bundler", // goes to base
    "resolveJsonModule": true,   // goes to base
    "isolatedModules": true,     // goes to base
    "jsx": "react-jsx",          // apps/web only
    "incremental": true,         // apps/web only
    "plugins": [{ "name": "next" }], // apps/web only
    "paths": { "@/*": ["./src/*"] }  // apps/web only
  }
}
```

**`tsconfig.base.json` at root:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

Note: Base uses `ES2020` target (not ES2017). The Next.js app's own tsconfig will keep `target: "ES2017"` if needed for Next.js build compatibility — the per-package `extends` can override target. Packages use ES2020 since they target modern browsers.

**`apps/web/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "noEmit": true,
    "allowJs": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

**`packages/encoder/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@encoder/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/player/tsconfig.json`:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@player/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Pattern 3: pnpm Workspace Definition

```yaml
# pnpm-workspace.yaml at repo root
packages:
  - 'apps/*'
  - 'packages/*'
```

### Pattern 4: Root package.json

```json
{
  "name": "asciify-monorepo",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "engines": {
    "node": ">=24",
    "pnpm": ">=10"
  },
  "scripts": {
    "dev": "turbo run dev --filter=web",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.9.3",
    "typescript": "^5"
  }
}
```

The `packageManager` field causes npm to warn and exit when a developer accidentally runs `npm install`.

### Pattern 5: turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": []
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
- `"dependsOn": ["^build"]` for build/dev/typecheck/test — packages must build before app consumes them
- `"lint"` has `"dependsOn": []` — lint can run in parallel without upstream builds
- `"persistent": true` + `"cache": false` for dev — dev server is a long-running process
- `".next/**"` in outputs, with `"!.next/cache/**"` exclusion — cache the build artifact, not Next.js's internal cache

### Pattern 6: apps/web package.json (after migration)

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "@ffmpeg/ffmpeg": "^0.12.15",
    "@ffmpeg/util": "^0.12.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "gif.js": "^0.2.0",
    "lucide-react": "^1.7.0",
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "shadcn": "^4.1.2",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

All current dependencies move to `apps/web/package.json` unchanged. This is a move, not an edit.

### Pattern 7: Package Shell package.json (encoder and player)

Phase 1 only creates shells — no build tool (tsup) needed yet. tsup is added in Phase 2/3 when code is extracted.

**`packages/encoder/package.json`:**

```json
{
  "name": "@asciify/encoder",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**`packages/player/package.json`:**

```json
{
  "name": "@asciify/player",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

Note: `main` points to `src/index.ts` in Phase 1 because there is no build step yet. This is fine — `apps/web` does NOT depend on these packages yet. The `workspace:*` dependency is added in Phase 2 (encoder) and Phase 3 (player) when code is actually extracted.

### Pattern 8: .npmrc at root

```ini
strict-peer-dependencies=false
auto-install-peers=true
# Do NOT use shamefully-hoist=true
```

`strict-peer-dependencies=false` avoids excessive install warnings during initial migration when peer dep versions may temporarily mismatch. `shamefully-hoist=true` defeats pnpm's strict isolation — never use it.

### Pattern 9: .gitignore additions

Add to existing `.gitignore`:

```gitignore
# pnpm
.pnpm-debug.log*

# Turborepo
.turbo

# Package build artifacts
packages/*/dist/
```

### Anti-Patterns to Avoid

- **Running `next dev` from repo root after migration:** Next.js looks for `src/app/` relative to cwd. Use `pnpm --filter web dev` instead.
- **Adding `workspace:*` dependencies in Phase 1:** `apps/web` does NOT depend on encoder/player yet — those packages are empty stubs. Add workspace dependencies in Phase 2+.
- **Using `shamefully-hoist=true` in .npmrc:** Defeats pnpm's entire purpose. Use `public-hoist-pattern` for specific packages if needed.
- **Forgetting to add `next-env.d.ts` to apps/web include:** When tsconfig moves to `apps/web/`, the `include` paths must be relative to `apps/web/`. The `next-env.d.ts` file moves there too.
- **Keeping `tsconfig.tsbuildinfo` in repo root:** Delete it during migration. It will be regenerated in `apps/web/` after `pnpm --filter web build`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-package task ordering | Custom shell scripts | Turborepo `dependsOn: ["^build"]` | Turborepo handles topological task sorting + caching + parallelism |
| pnpm version enforcement | CI version checks | `"packageManager"` field in package.json + corepack | Node.js/corepack enforces this natively; engineers get helpful error on wrong version |
| Phantom dependency detection | Import linter scripts | Run `pnpm install` + `pnpm build` immediately after migration | pnpm's non-flat `node_modules` surfaces these errors automatically at install/build time |

---

## Common Pitfalls

### Pitfall 1: pnpm Phantom Dependencies Break the App Build

**What goes wrong:** npm hoists all transitive dependencies to root `node_modules`, making unhoisted imports work silently. pnpm's symlinked structure only exposes what's declared. After migration, imports that worked with npm may fail with `Cannot find module 'X'`.

**Why it happens:** The current repo has no phantom dep issues (verified: all imports in `src/` are `lucide-react`, `react`, `zustand`, `@base-ui/react`, `next`, `class-variance-authority`, `clsx`, `tailwind-merge` — all declared in `package.json`). This is still the first thing to verify after `pnpm install`.

**How to avoid:** Run `pnpm build` immediately after `pnpm install`. Fix any `Cannot find module` errors before continuing. If a specific package must be hoisted, use `.npmrc` with `public-hoist-pattern[]=<pkg>`.

**Warning signs:** `Cannot find module 'X'` where X is not in `apps/web/package.json`.

### Pitfall 2: `@/*` Path Alias Breaks After Moving to `apps/web/`

**What goes wrong:** The current `tsconfig.json` at repo root maps `"@/*": ["./src/*"]`. After the app moves to `apps/web/`, the new tsconfig at `apps/web/tsconfig.json` must map `"@/*": ["./src/*"]` — relative to `apps/web/`. If the path is wrong (e.g., `../../src/*`), TypeScript and Next.js will both fail to resolve imports.

**Why it happens:** Path aliases in tsconfig are relative to the directory containing the tsconfig, not the repo root.

**How to avoid:** In `apps/web/tsconfig.json`, set `"paths": { "@/*": ["./src/*"] }`. The `./src/*` is relative to `apps/web/`, which is the correct location. Verify with `pnpm --filter web typecheck` after the move.

**Warning signs:** `Cannot find module '@/lib/...'` in Next.js dev output; TypeScript reports module not found for `@/*` imports.

### Pitfall 3: `package-lock.json` Not Deleted Causes Mixed Lockfile State

**What goes wrong:** If `package-lock.json` remains, tooling uses heuristics to pick npm vs pnpm. A teammate running `npm install` by accident regenerates it, creating a diverged dependency tree.

**How to avoid:** Delete `package-lock.json` as the first step. Add it to `.gitignore`. Add `"packageManager": "pnpm@10.33.0"` to root `package.json`.

### Pitfall 4: Turborepo `outputs` Glob Mismatch Silently Empties dist/

**What goes wrong:** If `turbo.json`'s `outputs` array doesn't match where tsup writes files, Turborepo reports a cache hit but restores nothing — `dist/` is empty.

**How to avoid:** For packages: `"outputs": ["dist/**"]`. For Next.js app: `"outputs": [".next/**", "!.next/cache/**"]`. Verify with `turbo build --dry=json`.

### Pitfall 5: `next-env.d.ts` Missing from `apps/web/`

**What goes wrong:** Next.js generates `next-env.d.ts` in the project root (the directory where `next` commands run). After moving to `apps/web/`, the file must be generated there. If developers run `pnpm --filter web dev` for the first time and this file is missing, TypeScript errors about missing Next.js types may appear.

**How to avoid:** Either copy the existing `next-env.d.ts` to `apps/web/`, or run `pnpm --filter web dev` once to let Next.js regenerate it. The file is auto-generated and should be in `.gitignore`.

### Pitfall 6: Turborepo `ui: "tui"` Requires Terminal Support

**What goes wrong:** `"ui": "tui"` in `turbo.json` enables the terminal UI (interactive task view). In CI environments that don't support TTY, this may cause display issues.

**How to avoid:** Keep `"ui": "tui"` for local development. For CI, run `turbo build --no-daemon` or set `TURBO_UI=false`. This is a low-priority concern for Phase 1 (no CI yet).

---

## Code Examples

### Verifying app after migration

```bash
# Source: pnpm workspace protocol — standard pnpm feature
pnpm --filter web dev
# Expected: Next.js dev server starts on localhost:3000

pnpm --filter web typecheck
# Expected: 0 TypeScript errors

turbo build
# Expected: packages/encoder and packages/player build (stubs), then apps/web builds
```

### Running specific tasks in Phase 1

```bash
# Build only apps/web (no upstream packages since they have no build script yet)
pnpm --filter web build

# Lint only apps/web
pnpm --filter web lint

# Install a new dep in apps/web (not globally)
pnpm add --filter web <package>

# Install a root devDep
pnpm add -Dw turbo
```

### Verifying pnpm workspace setup

```bash
# List all workspaces
pnpm ls -r --depth=0

# Expected output:
# @asciify/encoder@0.1.0
# @asciify/player@0.1.0
# web@0.1.0
```

### Verifying Turborepo pipeline

```bash
# Dry run — shows what turbo would do without executing
turbo build --dry=json | python3 -m json.tool | grep -E '"taskId"|"cache"'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm workspaces | pnpm workspaces | pnpm 7+ (2022+) | Strict isolation; workspace:* protocol replaces semver on publish |
| Lerna for task running | Turborepo | ~2021 (Vercel acquisition) | Content-hash caching; simpler config; first-class pnpm support |
| `shamefully-hoist=true` pnpm | `public-hoist-pattern` for specific pkgs | pnpm 6+ | Targeted hoisting preserves isolation for everything else |
| tsconfig `paths` for internal packages | `workspace:*` pnpm protocol + pre-built packages | pnpm workspace era | No `transpilePackages` needed; packages ship compiled `dist/` |

**Deprecated/outdated:**

- Lerna (standalone): deprecated, then revived by Nx team — no advantage over Turborepo directly
- `yarn workspaces` PnP mode: ecosystem compatibility issues in 2026; avoid
- `transpilePackages` for App Router: only needed for Pages Router; App Router handles pre-built packages natively (verified from Next.js 16 docs)

---

## Open Questions

1. **Tailwind CSS 4 config location**
   - What we know: The project uses Tailwind CSS 4 via `@tailwindcss/postcss` plugin, not `tailwind.config.ts` (no `tailwind.config.ts` found in repo — Tailwind 4 uses CSS-first config). The `postcss.config.mjs` contains the Tailwind plugin configuration.
   - What's unclear: Whether the `postcss.config.mjs` needs to be at `apps/web/` root or whether Turborepo/Next.js needs any special configuration to find it.
   - Recommendation: Move `postcss.config.mjs` to `apps/web/` alongside `next.config.ts`. It is Next.js/Tailwind-specific and should not be at the monorepo root.

2. **ESLint config for package shells**
   - What we know: `eslint.config.mjs` uses `eslint-config-next` which is Next.js-specific. Package shells don't need Next.js linting.
   - What's unclear: Whether Claude's discretion here means "do nothing" or "add a shared config."
   - Recommendation: Move `eslint.config.mjs` to `apps/web/`. Leave packages without ESLint config in Phase 1 (they only have a stub `index.ts` anyway). Add package ESLint setup in Phase 2 when real code arrives.

3. **`components.json` (shadcn) location**
   - What we know: `components.json` is the shadcn config — it references `"aliases"` with `@/*` paths and `"componentPath"`. It must stay in `apps/web/` since shadcn is an app-level tool.
   - Recommendation: Move to `apps/web/`. Update any `@/*` aliases if they reference paths relative to repo root.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tasks | ✓ | v24.7.0 | — |
| pnpm | Package manager | ✓ | 9.15.0 (upgrade to 10.33.0 via corepack) | — |
| corepack | pnpm version pinning | ✓ | 0.34.0 | Manual pnpm install |
| turbo | Task orchestration | ✗ (not installed globally) | — | Install as devDep: `pnpm add -Dw turbo` |
| npm | (replaced) | ✓ | — | Replaced by pnpm |

**Missing dependencies with no fallback:**

- None — all required tools are either installed or installable via `pnpm add`.

**Missing dependencies with fallback:**

- `turbo`: Not globally installed but added as devDependency; run via `pnpm exec turbo` or `./node_modules/.bin/turbo`. Adding to root `package.json` `scripts` handles this transparently.
- `pnpm 10.33.0`: Machine has 9.15.0. Upgrade via `corepack prepare pnpm@10.33.0 --activate`. If corepack fails, use `npm install -g pnpm@10.33.0` as fallback.

---

## Validation Architecture

### Test Framework

Phase 1 creates no production code and no new test files. The app is moved, not modified. The validation is operational (does the app run?) not code-coverage-based.

| Property | Value |
|----------|-------|
| Framework | None in Phase 1 (no test files exist in codebase) |
| Config file | none — Wave 0 for Phase 2 |
| Quick run command | `pnpm --filter web typecheck` |
| Full suite command | `pnpm --filter web build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MONO-01 | pnpm workspaces + apps/web + packages/* layout | structural | `pnpm ls -r --depth=0` | N/A (runtime check) |
| MONO-02 | Turborepo build pipeline with dependsOn | structural | `turbo build --dry=json` | N/A (runtime check) |
| MONO-03 | Next.js app runs from apps/web | smoke | `pnpm --filter web typecheck && pnpm --filter web build` | N/A (build output) |
| MONO-04 | tsconfig.base.json used by all packages | structural | `pnpm --filter web typecheck` | N/A (type check) |
| MONO-05 | pnpm-lock.yaml exists, package-lock.json absent | structural | `ls pnpm-lock.yaml && ! ls package-lock.json` | N/A (file check) |

### Sampling Rate

- **Per task commit:** `pnpm --filter web typecheck`
- **Per wave merge:** `pnpm --filter web build`
- **Phase gate:** `pnpm --filter web build` passes + `pnpm --filter web dev` starts without errors

### Wave 0 Gaps

None for Phase 1 — this phase contains no production logic to test. The "tests" are build/typecheck smoke tests, not unit tests. Test infrastructure (vitest) is set up in Phase 2.

---

## Migration Execution Order

The following sequence is the safe migration order for Phase 1. Each step is an atomic commit.

**Step 1: Workspace config at root (no file moves yet)**
- Create `pnpm-workspace.yaml`
- Create `turbo.json`
- Create `tsconfig.base.json`
- Modify root `package.json` (add `packageManager`, `engines`, `turbo` devDep, updated scripts)
- Create `.npmrc`
- Update `.gitignore`

**Step 2: pnpm migration (while app still at root)**
- Delete `node_modules/`, `package-lock.json`, `tsconfig.tsbuildinfo`
- `corepack enable && corepack prepare pnpm@10.33.0 --activate`
- `pnpm install` (generates `pnpm-lock.yaml`)
- Verify: `pnpm --filter . run lint` or `pnpm exec next dev` still works from root

**Step 3: Create package shells**
- Create `packages/encoder/` with `package.json`, `tsconfig.json`, `src/index.ts`
- Create `packages/player/` with `package.json`, `tsconfig.json`, `src/index.ts`
- `pnpm install` (registers new packages in workspace)

**Step 4: Move app to `apps/web/`**
- Create `apps/web/` directory
- Move all app files: `src/`, `public/`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `next-env.d.ts`
- Move `package.json` to `apps/web/package.json` (update `name: "web"`)
- Create new `apps/web/tsconfig.json` that extends `../../tsconfig.base.json`
- Add `typecheck` and `clean` scripts to `apps/web/package.json`
- `pnpm install` (re-links workspace)

**Step 5: Verify**
- `pnpm --filter web typecheck` — 0 errors
- `pnpm --filter web build` — build succeeds
- `pnpm --filter web dev` — dev server starts, app loads correctly
- `turbo build --dry=json` — pipeline shows correct ordering
- `ls pnpm-lock.yaml && ! ls package-lock.json` — lockfile check passes

---

## Sources

### Primary (HIGH confidence)

- npm registry: `npm info pnpm version` → 10.33.0; `npm info turbo version` → 2.9.3 (verified 2026-04-02)
- `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md` — confirmed: App Router does NOT need `transpilePackages` for pre-built packages
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md` — confirmed: Pages Router only
- Direct codebase analysis: `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `src/` import audit — no phantom dependencies found
- `.planning/research/STACK.md` — project-level stack research (turbo, pnpm, tsup versions)
- `.planning/research/ARCHITECTURE.md` — project-level architecture, migration order
- `.planning/research/PITFALLS.md` — phantom dep, Turborepo cache, migration pitfalls

### Secondary (MEDIUM confidence)

- `.planning/codebase/STRUCTURE.md` + `.planning/codebase/STACK.md` — codebase analysis (files to move, naming conventions)
- Environment probes: `pnpm --version` → 9.15.0; `node --version` → v24.7.0; `corepack --version` → 0.34.0

### Tertiary (LOW confidence)

- None for this phase.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — pnpm 10.33.0 and turbo 2.9.3 verified from npm registry
- Architecture: HIGH — derived from direct codebase analysis + established monorepo conventions
- Pitfalls: HIGH — phantom dep risk verified by import audit (no phantom deps found); migration sequence derived from ARCHITECTURE.md
- tsconfig split: HIGH — current tsconfig.json analyzed directly; split derived from its contents

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (tools are stable; pnpm/turbo release frequently but patch-level changes won't affect this plan)
