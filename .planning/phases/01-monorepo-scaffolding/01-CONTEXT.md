# Phase 1: Monorepo Scaffolding - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the existing single Next.js app into a pnpm + Turborepo monorepo workspace. Move the app to `apps/web`, create empty package shells for `@asciify/encoder` and `@asciify/player`, and verify the app runs correctly from its new location. No code extraction happens in this phase — that's Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Directory Layout
- **D-01:** Monorepo layout: `apps/web/` (Next.js app), `packages/encoder/` and `packages/player/` (library shells)
- **D-02:** Flat `src/` directory per package — `packages/encoder/src/index.ts`, `packages/player/src/index.ts`. No nested structure.
- **D-03:** Shared types (AsciiFrame, AsciiCell, ColorMode, DitherMode) owned by `@asciify/encoder`. Player imports types from encoder — no separate shared package.

### Migration Strategy
- **D-04:** Clean slate npm → pnpm migration — delete `node_modules/` and `package-lock.json`, run `pnpm install` fresh. Accept that phantom dependency issues surface immediately.
- **D-05:** Brief app downtime acceptable — app can be broken for intermediate commits during restructuring, as long as `pnpm --filter web dev` works at the end of Phase 1.

### Path Alias Handling
- **D-06:** Scoped path aliases per package — `@encoder/*` for encoder, `@player/*` for player, `@/*` stays as `./src/*` in `apps/web`. Each package's tsconfig defines its own alias.

### Config Inheritance
- **D-07:** `tsconfig.base.json` at monorepo root with shared strict settings (target, strict mode, moduleResolution). Each package/app extends it and adds own paths/target.
- **D-08:** Turborepo caches `build`, `lint`, and `test` tasks. `dev` task has `cache: false` and `persistent: true`. Pipeline uses `dependsOn: ["^build"]` so packages build before app.

### Claude's Discretion
- ESLint config organization (shared vs per-package)
- Tailwind/PostCSS config placement (likely stays in `apps/web` only since packages are non-visual libraries)
- Exact Turborepo pipeline task definitions beyond build/lint/test/dev
- `.gitignore` updates for pnpm and Turborepo artifacts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current project structure
- `.planning/codebase/STRUCTURE.md` — Current directory layout, all file locations
- `.planning/codebase/STACK.md` — Current tech stack, dependencies, versions
- `.planning/codebase/CONVENTIONS.md` — Code style, naming patterns, import organization

### Research
- `.planning/research/STACK.md` — Recommended monorepo stack: pnpm 10, Turborepo 2.9, tsup 8.5
- `.planning/research/ARCHITECTURE.md` — Monorepo layout design, package dependency graph, build order
- `.planning/research/PITFALLS.md` — pnpm phantom deps, Turborepo cache pitfalls, migration risks

### Existing configs to migrate
- `tsconfig.json` — Current TypeScript config (must be split into base + per-package)
- `package.json` — Current dependencies (must be split between app and packages)
- `eslint.config.mjs` — Current ESLint config
- `postcss.config.mjs` — PostCSS config (stays in apps/web)
- `.nvmrc` — Node version lock (stays at root)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tsconfig.json` — strict TypeScript config with `moduleResolution: "bundler"`, `@/*` path alias. Base settings can be extracted directly.
- `eslint.config.mjs` — flat ESLint config with next/core-web-vitals and next/typescript. Can remain in apps/web.
- `.nvmrc` (Node 24) — stays at root, shared by all packages.

### Established Patterns
- All imports use `@/*` path alias (maps to `./src/*`) — every import in the codebase needs updating when the app moves to `apps/web/src/*`
- `src/lib/` contains all library code that will eventually move to packages (Phase 2+)
- `src/components/` and `src/stores/` stay in `apps/web`
- `src/types/webgpu.d.ts` — custom type declaration, stays in app

### Integration Points
- `next.config.ts` — minimal config, moves to `apps/web/next.config.ts`
- `src/app/` — Next.js app router, moves to `apps/web/src/app/`
- `public/` — static assets, moves to `apps/web/public/`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants a clean, standard Turborepo + pnpm setup.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-monorepo-scaffolding*
*Context gathered: 2026-04-02*
