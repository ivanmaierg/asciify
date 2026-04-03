---
phase: 03
slug: player-scaffold-grid-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `packages/player/vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `pnpm --filter @asciify/player test` |
| **Full suite command** | `pnpm turbo test --filter @asciify/player` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @asciify/player test`
- **After every plan wave:** Run `pnpm turbo test --filter @asciify/player`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | PLR-01 | smoke | `pnpm --filter @asciify/player build && ls dist/index.{js,cjs,global.js}` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PLR-02, PLR-08, PLR-09, PLR-13 | unit | `vitest run tests/web-component.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PLR-03, PLR-07, PLR-11, MODE-05 | unit | `vitest run tests/player.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | PLR-04, PLR-05, PLR-06, PLR-12 | unit | `vitest run tests/playback.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 1 | MODE-01 | unit | `vitest run tests/renderer.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | PLR-10 | smoke | `grep -L '@chenglou/pretext' dist/index.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/player/vitest.config.ts` — vitest config with `environment: 'happy-dom'`
- [ ] `packages/player/tests/player.test.ts` — AsciiPlayer class unit tests
- [ ] `packages/player/tests/playback.test.ts` — FPS throttle, seekTo, loop state machine
- [ ] `packages/player/tests/renderer.test.ts` — Canvas mock rendering verification
- [ ] `packages/player/tests/web-component.test.ts` — Custom element tests
- [ ] Framework install: `pnpm add -D vitest happy-dom --filter @asciify/player`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual glyph rendering quality | MODE-01 | Canvas pixel output not verifiable in happy-dom | Load test page with `<ascii-player>`, visually confirm character alignment |
| Font loading flash check | PLR-11 | Requires real browser font loading | Open test page, observe no unstyled text flash before playback starts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
