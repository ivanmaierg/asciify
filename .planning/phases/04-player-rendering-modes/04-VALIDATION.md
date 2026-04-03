---
phase: 04
slug: player-rendering-modes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 (unit/integration/snapshot) + @playwright/test 1.59.1 (browser) |
| **Config file** | `packages/player/vitest.config.ts` (exists) + `packages/player/playwright.config.ts` (Wave 0) |
| **Quick run command** | `pnpm --filter @asciify/player test` |
| **Full suite command** | `pnpm --filter @asciify/player test && cd packages/player && npx playwright test` |
| **Estimated runtime** | ~10 seconds (vitest) + ~15 seconds (playwright) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @asciify/player test`
- **After every plan wave:** Run full suite including playwright
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MODE-02 | unit | `pnpm --filter @asciify/player test -- renderer.test.ts -t "proportional"` | Wave 0 | pending |
| TBD | TBD | TBD | MODE-03 | unit | `pnpm --filter @asciify/player test -- player.test.ts -t "typewriter"` | Wave 0 | pending |
| TBD | TBD | TBD | MODE-04 | unit | `pnpm --filter @asciify/player test -- player.test.ts -t "timestamps"` | Wave 0 | pending |
| TBD | TBD | TBD | XTRA-01 | unit | `pnpm --filter @asciify/player test -- web-component.test.ts -t "theme"` | partial | pending |
| TBD | TBD | TBD | XTRA-02 | unit | `pnpm --filter @asciify/player test -- web-component.test.ts -t "trigger"` | Wave 0 | pending |
| TBD | TBD | TBD | TEST-02 | unit | `pnpm --filter @asciify/player test` | Wave 0 | pending |
| TBD | TBD | TBD | TEST-03 | integration | `pnpm --filter @asciify/player test -- integration.test.ts` | extend | pending |
| TBD | TBD | TBD | TEST-04 | snapshot | `pnpm --filter @asciify/player test -- snapshot.test.ts` | Wave 0 | pending |
| TBD | TBD | TBD | TEST-05 | browser | `cd packages/player && npx playwright test` | Wave 0 | pending |

*Status: pending / green / red / flaky*
*Note: Task IDs will be filled after plans are created*

---

## Wave 0 Requirements

- [ ] `packages/player/playwright.config.ts` — Playwright configuration
- [ ] `packages/player/tests/snapshot.test.ts` — canvas API call sequence snapshots (TEST-04)
- [ ] `packages/player/tests/browser/web-component.spec.ts` — Playwright browser tests (TEST-05)
- [ ] Install: `pnpm add -D @playwright/test --filter @asciify/player`
- [ ] Extend: `packages/player/tests/renderer.test.ts` — proportional render tests
- [ ] Extend: `packages/player/tests/player.test.ts` — typewriter, timestamp, mode tests
- [ ] Extend: `packages/player/tests/web-component.test.ts` — trigger, char-delay tests
- [ ] Extend: `packages/player/tests/integration.test.ts` — new export checks

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual proportional font rendering | MODE-02 | Font rendering varies across OS | Open test page with `mode="proportional"`, verify characters align with variable widths |
| Typewriter animation smoothness | MODE-03 | Animation timing perception is subjective | Open test page with `mode="typewriter"`, verify smooth character-by-character reveal |
| Scroll trigger in real page | XTRA-02 | Requires real scrollable page with viewport | Create scrollable test page, verify player starts on scroll-into-view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
