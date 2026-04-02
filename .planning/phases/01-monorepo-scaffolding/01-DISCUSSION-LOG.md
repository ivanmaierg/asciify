# Phase 1: Monorepo Scaffolding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 01-Monorepo Scaffolding
**Areas discussed:** Directory layout, Migration strategy, Path alias handling, Config inheritance

---

## Directory Layout

### Package internal structure
| Option | Description | Selected |
|--------|-------------|----------|
| Flat src/ per package | packages/encoder/src/, packages/player/src/ — simple, standard. tsup reads from src/index.ts | ✓ |
| Nested with tests | packages/encoder/src/ + packages/encoder/tests/ — co-located tests | |
| You decide | Claude picks standard approach | |

**User's choice:** Flat src/ per package

### Shared types location
| Option | Description | Selected |
|--------|-------------|----------|
| In encoder package | Encoder owns types since it produces them. Player imports from @asciify/encoder. | ✓ |
| Separate shared package | @asciify/shared or @asciify/types — both packages import from it. | |
| Duplicated | Each package defines own compatible types. No cross-dep but drift risk. | |

**User's choice:** In encoder package

---

## Migration Strategy

### npm → pnpm migration approach
| Option | Description | Selected |
|--------|-------------|----------|
| Clean slate | Delete node_modules + package-lock.json, pnpm install fresh. May surface phantom deps all at once. | ✓ |
| Incremental | Move files first, verify with npm, then switch to pnpm. Slower but isolates failures. | |
| You decide | Claude picks based on risk assessment | |

**User's choice:** Clean slate

### App continuity during migration
| Option | Description | Selected |
|--------|-------------|----------|
| Must work at every step | Every commit leaves app runnable. Slower but safer. | |
| Brief downtime OK | App can be broken for a few commits while restructuring. | ✓ |
| You decide | Claude picks safest approach | |

**User's choice:** Brief downtime OK

---

## Path Alias Handling

### Path alias strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Keep @/* in app only | @/* stays in apps/web. Packages use relative imports. | |
| Scoped aliases per package | @encoder/* for encoder, @player/* for player, @/* for app. | ✓ |
| You decide | Claude picks standard approach | |

**User's choice:** Scoped aliases per package

---

## Config Inheritance

### TypeScript config organization
| Option | Description | Selected |
|--------|-------------|----------|
| Base + per-package extends | tsconfig.base.json at root. Each package extends and adds own paths. | ✓ |
| Turborepo references | TypeScript project references for incremental builds. More complex. | |
| You decide | Claude picks based on project size | |

**User's choice:** Base + per-package extends

### Turborepo cache strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Build + lint + test | Cache all three. dev always fresh (cache: false). | ✓ |
| Build only | Only cache builds. Lint and test always run fresh. | |
| You decide | Claude configures standard pipeline | |

**User's choice:** Build + lint + test

---

## Claude's Discretion

- ESLint config organization
- Tailwind/PostCSS config placement
- Exact Turborepo pipeline definitions beyond core tasks
- .gitignore updates

## Deferred Ideas

None — discussion stayed within phase scope.
