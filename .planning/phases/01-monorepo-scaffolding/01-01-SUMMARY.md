---
phase: 01-monorepo-scaffolding
plan: 01
subsystem: root-config
tags: [monorepo, pnpm, turborepo, typescript, config]
dependency_graph:
  requires: []
  provides:
    - pnpm workspace definition (apps/* and packages/*)
    - Turborepo task pipeline (build/dev/lint/typecheck/test/clean)
    - Shared TypeScript base config (tsconfig.base.json)
    - Package manager enforcement (pnpm@10.33.0)
  affects:
    - Plan 02: tsconfig.base.json extended by package tsconfigs
    - Plan 03: pnpm-workspace.yaml enables apps/web as workspace member; package.json turbo scripts drive dev/build
tech_stack:
  added:
    - turbo ^2.9.3 (devDependency at root)
  patterns:
    - Turborepo pipeline with ^build dependsOn for topological ordering
    - pnpm workspaces with strict peer dependency resolution disabled
    - tsconfig inheritance pattern (base -> app-specific)
key_files:
  created:
    - pnpm-workspace.yaml
    - turbo.json
    - .npmrc
    - tsconfig.base.json
  modified:
    - package.json (renamed to asciify-monorepo, stripped app deps, added turbo)
    - .gitignore (added .turbo and packages/*/dist/)
decisions:
  - "turbo dev uses --filter=web to only start the Next.js app, not all workspace packages"
  - "tsconfig.base.json uses ES2020 target; apps/web will override with ES2017 for Next.js compat"
  - "shamefully-hoist=false (omitted from .npmrc) to preserve pnpm strict isolation"
metrics:
  duration: 49s
  completed: "2026-04-02"
  tasks_completed: 2
  files_changed: 6
---

# Phase 01 Plan 01: Root Workspace Configuration Summary

pnpm workspace + Turborepo monorepo scaffolding with 6-task pipeline, shared TypeScript base config, and package manager enforcement via `pnpm@10.33.0`.

## What Was Built

Created all root-level configuration files needed to turn the single-app repo into a pnpm + Turborepo monorepo:

- **pnpm-workspace.yaml** — declares `apps/*` and `packages/*` as workspace members
- **turbo.json** — 6-task pipeline: build, dev, lint, typecheck, test, clean; build/dev/typecheck/test have `"dependsOn": ["^build"]` for topological ordering; dev has `"persistent": true` and `"cache": false`; lint has empty `dependsOn`; clean has `"cache": false`
- **.npmrc** — `strict-peer-dependencies=false` and `auto-install-peers=true` (no `shamefully-hoist`)
- **tsconfig.base.json** — shared compiler options: ES2020 target, ESNext module, bundler moduleResolution, strict mode, declaration + declarationMap + sourceMap outputs, lib includes ES2020+DOM
- **package.json** — renamed to `asciify-monorepo`, version `0.0.0`, `packageManager: pnpm@10.33.0`, engines node >=24 / pnpm >=10, all app dependencies removed (moved to apps/web in Plan 03), scripts use `turbo run *`
- **.gitignore** — appended `.turbo` and `packages/*/dist/` entries

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create pnpm-workspace.yaml, turbo.json, .npmrc | 5d96ccb | pnpm-workspace.yaml, turbo.json, .npmrc |
| 2 | Create tsconfig.base.json and update root package.json and .gitignore | cf052eb | tsconfig.base.json, package.json, .gitignore |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. This plan is pure configuration — no UI components or data sources involved.

## Self-Check: PASSED
