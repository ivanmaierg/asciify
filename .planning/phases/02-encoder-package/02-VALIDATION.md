---
phase: 2
slug: encoder-package
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `packages/encoder/vitest.config.ts` — Wave 0 creates this |
| **Quick run command** | `pnpm --filter @asciify/encoder test` |
| **Full suite command** | `turbo run test --filter=@asciify/encoder` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @asciify/encoder test`
- **After every plan wave:** Run `pnpm --filter @asciify/encoder test && pnpm --filter web typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ENC-01 | smoke | `pnpm --filter @asciify/encoder build` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ENC-02 | unit | `pnpm --filter @asciify/encoder test -- tests/ascii-engine.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | ENC-03 | smoke | `pnpm --filter @asciify/encoder typecheck` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | ENC-04 | unit | `pnpm --filter @asciify/encoder test -- tests/ascii-engine.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | ENC-05 | unit | `pnpm --filter @asciify/encoder test -- tests/ascii-engine.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | ENC-06 | unit | `pnpm --filter @asciify/encoder test -- tests/rle.test.ts tests/delta-encoder.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | ENC-07 | unit | `pnpm --filter @asciify/encoder test -- tests/player-data.test.ts` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | ENC-08 | smoke | `pnpm --filter web typecheck` | ❌ | ⬜ pending |
| 02-05-01 | 05 | 2 | TEST-01 | unit | `pnpm --filter @asciify/encoder test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/encoder/vitest.config.ts` — vitest config for node environment
- [ ] `packages/encoder/tests/ascii-engine.test.ts` — covers ENC-02, ENC-04, ENC-05
- [ ] `packages/encoder/tests/rle.test.ts` — covers ENC-06 (RLE)
- [ ] `packages/encoder/tests/delta-encoder.test.ts` — covers ENC-06 (delta)
- [ ] `packages/encoder/tests/player-data.test.ts` — covers ENC-07
- [ ] Add `tsup` and `vitest` to `packages/encoder/package.json` devDependencies
- [ ] Add `build` and `test` scripts to `packages/encoder/package.json`
- [ ] Run `pnpm install` from root to install new devDeps

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `import { convertFrameToAscii } from '@asciify/encoder'` works in fresh project | ENC-01 | Requires external project context | Create temp dir, `npm init`, install built tarball, verify TS import compiles |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
