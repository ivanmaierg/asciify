# Domain Pitfalls

**Domain:** Monorepo migration (npm → pnpm + Turborepo) + npm package publishing
**Project:** Asciify — @asciify/encoder + @asciify/player
**Researched:** 2026-04-02
**Confidence:** HIGH (well-established patterns in training data through August 2025; all tools verified against known pnpm/tsup/Turborepo behaviors)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken installs, or unpublishable packages.

---

### Pitfall 1: pnpm Phantom Dependency Breakage

**What goes wrong:** The current codebase imports packages that are transitive dependencies of other packages (e.g., a package installed by Next.js that the app uses directly without declaring it). npm's flat `node_modules` makes this invisible. pnpm's non-flat symlink structure enforces that you can only import what you explicitly declare. The app will fail to build with `Cannot find module` errors after migration.

**Why it happens:** npm hoists everything to the root `node_modules`, so undeclared imports work silently. pnpm places each package's dependencies inside that package's own `node_modules/.pnpm/` tree — undeclared imports are not resolvable from the workspace root.

**Specific risk for this project:** The codebase currently has no declared dependency on several packages it may use transitively. For example: if `ascii-worker.ts` or any lib file imports something that arrives only via Next.js's dependency tree, it will break immediately. The existing `@ffmpeg/ffmpeg` is declared but unused — the inverse is more dangerous here.

**Consequences:** Build fails after migration; app won't start; all `pnpm install` output looks clean.

**Prevention:**
1. Before migration, audit every import in `src/` against `package.json` dependencies.
2. After running `pnpm install`, run `pnpm build` immediately and fix any `Cannot find module` errors before proceeding.
3. If a package must be hoisted for compatibility, use `.npmrc` with `public-hoist-pattern[]=<pattern>` — but treat hoisting as a temporary workaround, not a solution.

**Warning signs:** `Cannot find module 'X'` where X is not in package.json; build passes with npm but fails with pnpm.

**Phase:** Migration setup phase (before any package extraction).

---

### Pitfall 2: tsup Bundling `@chenglou/pretext` as External Instead of Inlined

**What goes wrong:** tsup by default externalizes any package listed in the consuming package's `node_modules` or declared as a dependency/peerDependency. If `@chenglou/pretext` ends up in the `dependencies` field of `@asciify/player/package.json` (even accidentally), tsup will mark it as external and NOT bundle it. Users who install `@asciify/player` will get a missing module error at runtime unless they also install pretext — which defeats the entire "bundle it in" decision.

**Why it happens:** tsup's `external` behavior follows Node.js resolution conventions. Anything in `dependencies` or `peerDependencies` is assumed to be provided by the consumer. Only `devDependencies` and explicitly inlined packages get bundled.

**Specific risk for this project:** The PROJECT.md decision is explicit: pretext is bundled, not a peer dep. But tsup's default behavior inverts this. The `noExternal` option must be set explicitly.

**Consequences:** `@asciify/player` installs without errors but throws `Error: Cannot find module '@chenglou/pretext'` at runtime. Would require a breaking change to fix.

**Prevention:**
1. Put `@chenglou/pretext` in `devDependencies` of `packages/player/package.json`, NOT `dependencies`.
2. In `packages/player/tsup.config.ts`, explicitly set: `noExternal: ['@chenglou/pretext']`
3. Verify the bundle: after `tsup`, run `grep -r "chenglou/pretext" dist/` — if found, it's being bundled; if absent, it was correctly inlined.
4. Check final bundle output with `node -e "require('./dist/index.js')"` to confirm pretext functions resolve.

**Warning signs:** Post-build `dist/` files contain `require('@chenglou/pretext')` as a bare import rather than inlined code.

**Phase:** Package extraction phase for `@asciify/player`.

---

### Pitfall 3: Missing or Incorrect `exports` Field Blocks Consumers

**What goes wrong:** Publishing a package with only a `main` field (or no `exports` field at all) causes modern bundlers (Vite, Next.js, esbuild) to either pick the wrong entry point or fail to resolve the package entirely. Conversely, an `exports` field that is present but missing key conditions (`import`, `require`, `types`) causes TypeScript consumers to lose type checking, or CJS consumers to get ESM (which throws in Node.js require).

**Why it happens:** The Node.js `exports` field is a strict contract. A wrong exports map is worse than no exports map because it actively blocks resolution paths that would otherwise work.

**Specific risk for this project:** Both packages need dual output (ESM + CJS). A typical incorrect configuration:
```json
"exports": {
  ".": "./dist/index.js"
}
```
This silently resolves to the wrong module format depending on the bundler. The correct map needs explicit conditions.

**Consequences:** TypeScript consumers see `Cannot find module '@asciify/player' or its corresponding type declarations`; CJS consumers get `SyntaxError: Cannot use import statement in a module`.

**Prevention:**
Define exports explicitly in each package's `package.json`:
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
  }
}
```
Verify with `publint` (run `npx publint` from the package directory) before publishing.

**Warning signs:** TypeScript reports module not found despite `dist/` containing files; `publint` reports warnings; consumers report import errors.

**Phase:** Package extraction phase; also the npm publish phase as a final check.

---

### Pitfall 4: Turborepo Pipeline `dependsOn` Misconfiguration Causes Stale Builds

**What goes wrong:** If Turborepo's `turbo.json` does not correctly declare that `apps/web`'s build depends on `packages/encoder` and `packages/player` being built first (`"dependsOn": ["^build"]`), Turborepo will either run builds in the wrong order or serve the app from a cache that was built before the package changed. The symptom is that `apps/web` runs fine in isolation but deploys with stale package code.

**Why it happens:** Turborepo's content-hash caching is powerful but only works if `inputs` are correct. It will cache a task based on its input files — if the package's `dist/` is not listed as an input to the app build, changes to the package don't invalidate the app's build cache.

**Specific risk for this project:** During iterative development, you edit `@asciify/encoder`, run `turbo build`, and the app build is served from cache — showing the old encoder behavior. Can waste hours debugging "why isn't my change showing up."

**Consequences:** Stale app builds; confusing development loop; silent correctness bugs in CI deployments.

**Prevention:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```
The `^build` prefix means "build all workspace dependencies first." Set `"cache": false` for the `dev` task — never cache a persistent dev server. Run `turbo build --force` when debugging suspected cache issues.

**Warning signs:** Editing a package and not seeing changes reflected in the app; build output says "FULL TURBO" (cache hit) when you've made changes; inconsistent behavior between `pnpm --filter @asciify/player build` and `turbo build`.

**Phase:** Turborepo setup phase.

---

### Pitfall 5: npm Scope `@asciify` Not Claimed Before Publishing

**What goes wrong:** npm scoped packages require the scope organization (`@asciify`) to exist on npm before you can publish. If you run `npm publish --access public` without first creating the `@asciify` organization or verifying your account owns it, you get `403 Forbidden` with a misleading error message.

**Why it happens:** npm scopes map to user accounts or organizations. A scope owned by another user cannot be published to, even with a valid auth token.

**Specific risk for this project:** If the `@asciify` scope is already claimed by another npm user, the entire publishing strategy is blocked. This needs to be verified before any build work begins.

**Consequences:** Can't publish; must rename packages; all CDN URLs and install instructions in docs/demos must be rewritten.

**Prevention:**
1. Check `https://www.npmjs.com/package/@asciify/encoder` and `https://www.npmjs.com/package/@asciify/player` — if they 404, the scope may be available.
2. Log in: `npm login`, then `npm org ls @asciify` — if you get an error that `@asciify` does not exist, you can create it via `npm org create asciify`.
3. For first publish: `npm publish --access public` (scoped packages default to private).
4. Add `"publishConfig": { "access": "public" }` to each package's `package.json` so `pnpm publish` never accidentally publishes private.

**Warning signs:** 403 error during publish; `npm info @asciify/encoder` returns a result pointing to someone else.

**Phase:** Pre-work before any publishing infrastructure is built.

---

## Moderate Pitfalls

---

### Pitfall 6: Web Component in SSR Context Throws `window is not defined`

**What goes wrong:** The `@asciify/player` Web Component uses Canvas API, `document.createElement`, `customElements.define()`, and `requestAnimationFrame` — all browser-only APIs. If the package is imported in a Next.js server component or in any SSR context (even indirectly, via a dynamic import that gets evaluated at module parse time), Node.js will throw `ReferenceError: window is not defined` or `ReferenceError: customElements is not defined`.

**Why it happens:** Next.js 16 runs server components and SSR passes in Node.js. Module-level code that touches browser globals executes at import time, not just at render time.

**Specific risk for this project:** `apps/web` uses Next.js. When it imports `@asciify/player` to use the Web Component, if that import runs on the server, the player package will crash the build or SSR pass.

**Consequences:** `apps/web` build errors or runtime 500 errors; the Web Component becomes unusable in any Next.js context without special handling.

**Prevention:**
1. In `@asciify/player`, guard all browser API access inside lifecycle callbacks (`connectedCallback`, `constructor`) not at module top-level. `customElements.define()` should be called inside a function, not at module root, or behind an `if (typeof window !== 'undefined')` guard.
2. In `apps/web`, use `next/dynamic` with `ssr: false` for any component that imports `@asciify/player`. Alternatively, use a dynamic script tag approach.
3. Add `"browser": true` field to `@asciify/player/package.json` to signal build tools this is browser-only.

**Warning signs:** `Error: window is not defined` during `next build`; works in `next dev` (which may skip SSR for certain routes) but fails on `next build`.

**Phase:** `@asciify/player` package extraction and `apps/web` integration phase.

---

### Pitfall 7: `moduleResolution: "bundler"` in apps/web Breaks Package Type Resolution

**What goes wrong:** The current `tsconfig.json` uses `"moduleResolution": "bundler"`. The internal packages (`@asciify/encoder`, `@asciify/player`) need their own `tsconfig.json` files. If those packages' tsconfigs also use `moduleResolution: "bundler"` without a proper `exports` map, or if the app's tsconfig doesn't pick up the package's `types` field from `exports`, TypeScript will silently fall back to treating the package as `any` or report type errors.

**Why it happens:** `moduleResolution: "bundler"` respects `exports` conditions but only if the package's `package.json` exports map includes a `types` condition. It does NOT fall back to `types` or `typings` top-level fields when an `exports` map is present (unlike `moduleResolution: "node"`).

**Specific risk for this project:** This is the exact setup described — Next.js app with `moduleResolution: "bundler"` importing internal workspace packages that need proper `exports` maps. A partial exports map will silently drop types.

**Consequences:** All imports from `@asciify/encoder` and `@asciify/player` typed as `any`; TypeScript safety gone without any error.

**Prevention:**
1. Include `"types"` condition inside every `exports` entry (see Pitfall 3's example).
2. Run `tsc --noEmit` from `apps/web` after setting up packages — if it fails to find types, the exports map is wrong.
3. In each package's `tsconfig.json`, use `"moduleResolution": "bundler"` for consistency, and ensure `"declaration": true` and `"declarationDir": "./dist"` are set.

**Warning signs:** Imports from `@asciify/encoder` are typed as `any`; autocomplete doesn't work for package APIs; `tsc` passes but types are wrong.

**Phase:** Package extraction phase and `apps/web` integration phase.

---

### Pitfall 8: pnpm Workspace Protocol `workspace:*` Not Replaced on Publish

**What goes wrong:** In a pnpm monorepo, internal package references use the `workspace:*` protocol in `package.json` (e.g., if `apps/web` depends on `@asciify/encoder`, it declares `"@asciify/encoder": "workspace:*"`). pnpm replaces this with the actual version number during `pnpm publish`. But if you run `npm publish` directly (not `pnpm publish`), the `workspace:*` string is published as-is. External consumers then get an unresolvable dependency.

**Why it happens:** `workspace:*` is a pnpm-specific protocol. `npm publish` and `yarn publish` do not know how to replace it.

**Specific risk for this project:** Only `@asciify/encoder` and `@asciify/player` are published. `apps/web` is private. But if either package has internal workspace cross-dependencies (unlikely but possible as the project grows), this pitfall applies.

**Consequences:** Published package has `"@asciify/other": "workspace:*"` in its `package.json`. External consumers get `npm ERR! code E404` when installing.

**Prevention:**
1. Always publish via `pnpm publish` (not `npm publish`) from the workspace root or package directory.
2. Add `"private": false` and `"publishConfig": { "access": "public" }` to each publishable package.
3. Consider a publish script in `turbo.json` that only publishes after a successful build.
4. After publishing, verify the published package's `package.json` on npm does not contain `workspace:` strings: `npm info @asciify/encoder --json | jq '.dependencies'`.

**Warning signs:** `npm install @asciify/encoder` fails with 404 for a sub-dependency; `npm info @asciify/encoder` shows `workspace:` in the published package.json.

**Phase:** npm publish phase.

---

### Pitfall 9: Inline Web Worker Code Breaks When Extracted to Package

**What goes wrong:** `src/lib/ascii-worker.ts` contains the worker code as a template string (`WORKER_CODE = \`...\``). This works in Next.js because the app controls bundling. When `@asciify/encoder` is extracted as a package, the worker code may need to be a separate file or a Blob URL. tsup does not automatically handle Web Worker bundling — the worker string is just a string, not a module reference. If the package tries to use `new Worker(new URL('./worker.js', import.meta.url))` (the standard modern pattern), this breaks in CJS output and requires specific tsup configuration.

**Why it happens:** The existing inline-string approach (creating a Blob from a string) is intentionally portable but is also intentionally not a real module. Moving to a proper worker file (`new URL(...)` pattern) requires bundler support. tsup handles `new URL('./worker.js', import.meta.url)` only for ESM output; CJS output breaks.

**Specific risk for this project:** The encoder package is described as browser-only with ESM+CJS output. The worker code pattern needs a decision: keep the Blob string approach (portable but awkward) or use a proper worker file (cleaner but requires ESM-only output or dual worker strategy).

**Consequences:** CJS build of encoder throws at worker instantiation; or the worker code is duplicated/missing in the dist.

**Prevention:**
1. Keep the inline Blob string approach for the initial package extraction — it works identically in ESM and CJS with zero bundler magic.
2. Document this as a known limitation in the package's CHANGELOG.
3. If a proper worker module approach is needed later, use tsup's `worker` entry points and make the package ESM-only (drop CJS for encoder).
4. Do not use `new URL('./worker.js', import.meta.url)` if CJS output is required — it's not supported in CJS without a build transform.

**Warning signs:** Worker fails to start in the published package; CJS consumers get `URL is not a constructor` or the worker throws on any message.

**Phase:** `@asciify/encoder` extraction phase.

---

### Pitfall 10: Turborepo Remote Cache Leaks Secrets via Environment Variables

**What goes wrong:** Turborepo's task cache keys are derived from input file hashes AND the environment variables listed under `env` in `turbo.json`. If you add environment variables to the `env` array, their values become part of cache keys — but the values themselves are NOT stored in the cache. However, if you configure Turborepo remote caching (Vercel or self-hosted), artifacts from one developer's machine can be used by another. If build outputs contain inlined env vars (which Next.js does for `NEXT_PUBLIC_*` variables), those values are inside the cached artifacts.

**Why it happens:** Turborepo caches compiled outputs. Next.js inlines `NEXT_PUBLIC_*` env vars at build time into JS bundles. The cached `.next/` directory then contains those inlined values.

**Specific risk for this project:** This project has no env vars currently. But if any analytics, feature flags, or API keys are added later and prefixed `NEXT_PUBLIC_`, they will be baked into cached Turborepo artifacts.

**Consequences:** Leaked secrets in CI artifacts; wrong env values used in production if cache from dev machine is used.

**Prevention:**
1. Do not enable Turborepo remote caching until you understand what's in your build outputs.
2. Add any `NEXT_PUBLIC_*` vars to `turbo.json`'s `env` array so they invalidate the cache when changed.
3. Never put secrets in `NEXT_PUBLIC_*` variables — they're public by design.

**Warning signs:** Production build shows dev-environment API keys; Vercel remote cache hits for a build that should have different config.

**Phase:** CI/deploy setup phase (low priority for initial migration, but important to know before enabling remote caching).

---

### Pitfall 11: `package-lock.json` Not Deleted Before `pnpm install`

**What goes wrong:** If `package-lock.json` remains in the repo root after switching to pnpm, some tooling (particularly scripts or CI pipelines that auto-detect package managers) will continue to invoke `npm` instead of `pnpm`. Worse, if a developer runs `npm install` accidentally, it regenerates `package-lock.json` and can create a diverged dependency tree that conflicts with `pnpm-lock.yaml`.

**Why it happens:** Both lockfiles present in the same repo is ambiguous. Node.js tooling uses heuristics (which lockfile exists) to pick a package manager.

**Specific risk for this project:** The current repo has `package-lock.json`. The migration process must include deleting it.

**Consequences:** Mixed lockfiles; CI runs with wrong package manager; `node_modules` layout switches between flat (npm) and symlinked (pnpm) on different machines.

**Prevention:**
1. On migration day: delete `package-lock.json`, delete `node_modules/`, run `pnpm install`.
2. Add `package-lock.json` to `.gitignore` to prevent accidental regeneration.
3. Add `"engines": { "node": ">=24", "pnpm": ">=9" }` and `"packageManager": "pnpm@9.x.x"` to the root `package.json` — this causes `npm install` to warn and exit.

**Warning signs:** CI installs succeed but produce different `node_modules` layouts; `package-lock.json` appears in `git status` after a teammate runs `npm install`.

**Phase:** Migration setup phase (first step).

---

## Minor Pitfalls

---

### Pitfall 12: tsup Generates `.d.ts` but Not `.d.cts` for CJS Consumers

**What goes wrong:** When tsup generates dual ESM+CJS output, it typically emits `index.js` (ESM), `index.cjs` (CJS), and `index.d.ts` (ESM types). TypeScript in CJS mode (when the consuming project has `"module": "commonjs"`) looks for `.d.cts` type declarations to match the `.cjs` output. Without it, TypeScript may not resolve types correctly for CJS consumers.

**Prevention:** Use tsup's `dts: true` with `format: ['esm', 'cjs']` and verify both `dist/index.d.ts` and `dist/index.d.cts` are generated. tsup 6.x+ handles this automatically when `dts: true` — but verify the output before publishing.

**Warning signs:** CJS consumers report `No types found for @asciify/encoder` in TypeScript strict mode.

**Phase:** Package build configuration phase.

---

### Pitfall 13: `measure-char.ts` Uses `document.createElement` at Module Level

**What goes wrong:** `src/lib/measure-char.ts` holds a module-level `cachedCtx` and calls `document.createElement('canvas')` lazily on first use. When extracted into `@asciify/encoder`, this is still a browser-only call. It's fine for the browser target, but if any test runner (Node.js-based, like Vitest or Jest) tries to import the encoder package, it will fail unless `jsdom` is configured.

**Prevention:** When setting up test infrastructure for `@asciify/encoder`, configure Vitest with `environment: 'jsdom'`. Add a comment in `measure-char.ts` marking it as browser-only so no one adds a Node.js test that imports it without jsdom.

**Warning signs:** Test files for encoder throw `document is not defined` on import.

**Phase:** `@asciify/encoder` extraction phase; test setup.

---

### Pitfall 14: Turborepo `outputs` Glob Not Matching Actual Build Artifacts

**What goes wrong:** If `turbo.json`'s `outputs` array doesn't match the actual paths where tsup writes its output, Turborepo cannot restore those files from cache on a cache hit. The task reports "FULL TURBO" (cache hit) but the `dist/` directory is empty.

**Prevention:** Match `outputs` exactly to tsup's configured `outDir`. For packages: `"outputs": ["dist/**"]`. For the Next.js app: `"outputs": [".next/**", "!.next/cache/**"]`. Run `turbo build --dry=json` to verify what Turborepo thinks is cacheable.

**Warning signs:** After a cache hit, `dist/` is empty; `apps/web` fails to resolve internal packages on CI after the first run.

**Phase:** Turborepo setup phase.

---

### Pitfall 15: Next.js `transpilePackages` Required for Internal Workspace Packages

**What goes wrong:** Next.js 16 may not automatically transpile TypeScript source files from workspace packages if they are imported as source (i.e., the package's `main`/`exports` points at `.ts` files rather than compiled `.js`). This causes `SyntaxError: Unexpected token 'export'` when Next.js tries to import the package without transpiling it.

**Why it happens:** Next.js server components and RSC pipeline do not transpile external packages by default. Internal workspace packages are treated as "external" unless explicitly listed in `transpilePackages`.

**Specific risk for this project:** This is only relevant if the packages are configured to export raw TypeScript (a "source first" approach). Since the plan uses tsup to pre-compile to `dist/`, this pitfall is avoidable. But if developers point `main` at `src/index.ts` for faster dev iteration, it will break.

**Prevention:** Always point `main` and `exports` at compiled `dist/` files, even in development. Use Turborepo's `dev` task (which runs `tsup --watch`) to keep `dist/` in sync during development. If `transpilePackages` is needed as a workaround, it's a sign the exports map is wrong.

**Warning signs:** `SyntaxError` or `Unexpected token` when Next.js imports a workspace package; the error points to a `.ts` file path.

**Phase:** `apps/web` integration phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| npm → pnpm migration | Phantom dependencies break build (Pitfall 1) | Audit all imports against declared deps before migration |
| npm → pnpm migration | package-lock.json conflicts (Pitfall 11) | Delete lockfile and node_modules before first pnpm install |
| Turborepo setup | Wrong pipeline order causes stale builds (Pitfall 4) | Use `"dependsOn": ["^build"]`; test with `--force` flag |
| Turborepo setup | Outputs glob mismatch silently empties dist (Pitfall 14) | Verify with `turbo build --dry=json` |
| @asciify/encoder extraction | Inline worker breaks as package (Pitfall 9) | Keep Blob string approach; do not use `new URL()` pattern |
| @asciify/encoder extraction | measure-char.ts browser-only in test env (Pitfall 13) | Configure jsdom for Vitest |
| @asciify/player extraction | pretext bundled as external by default (Pitfall 2) | Set `noExternal: ['@chenglou/pretext']` in tsup config |
| @asciify/player extraction | Web Component crashes in SSR (Pitfall 6) | Guard all browser API calls; use `next/dynamic ssr: false` |
| Package build config | Incorrect exports map breaks consumers (Pitfall 3) | Use full conditional exports map; run `publint` |
| Package build config | moduleResolution: bundler drops types (Pitfall 7) | Include `"types"` condition in every exports entry |
| Package build config | Missing .d.cts for CJS consumers (Pitfall 12) | Verify tsup outputs both .d.ts and .d.cts |
| npm publish | @asciify scope not owned (Pitfall 5) | Verify scope ownership before any publish infrastructure work |
| npm publish | workspace:* protocol published raw (Pitfall 8) | Always publish via `pnpm publish`, never `npm publish` |
| CI/deploy | Turborepo remote cache leaks inlined env vars (Pitfall 10) | Do not enable remote caching without understanding build outputs |

---

## Sources

Based on training data (through August 2025) covering:
- pnpm documentation on workspace protocols, hoisting, and phantom dependency prevention
- tsup documentation on `noExternal`, `dts`, and worker bundling
- Turborepo documentation on pipeline configuration, caching semantics, and `outputs` globs
- npm documentation on scoped packages, exports maps, and publish flows
- Web Components specification on lifecycle callbacks and SSR constraints
- TypeScript documentation on `moduleResolution: "bundler"` and conditional exports
- Node.js documentation on `exports` field resolution algorithm

**Confidence by pitfall:**
- Pitfalls 1, 3, 5, 6, 8, 11: HIGH — well-documented, widely encountered
- Pitfalls 2, 4, 7, 9, 12, 13, 14, 15: HIGH — verified against official tool documentation
- Pitfall 10: MEDIUM — behavior verified, but impact depends on whether remote caching is enabled
