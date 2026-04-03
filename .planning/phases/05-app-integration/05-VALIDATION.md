---
phase: 05
slug: app-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 (player package tests) |
| **Config file** | `packages/player/vitest.config.ts` (exists) |
| **Quick run command** | `pnpm turbo test` |
| **Full suite command** | `pnpm turbo test && pnpm turbo build` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm turbo test`
- **After every plan wave:** Run `pnpm turbo test && pnpm turbo build`
- **Before `/gsd:verify-work`:** Full suite green + manual browser verification
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | APP-01 | smoke | `pnpm turbo build && pnpm turbo test` | partial | pending |
| TBD | TBD | TBD | APP-02 | manual | Browser test of exported HTML | n/a | pending |
| TBD | TBD | TBD | APP-03 | smoke | `pnpm turbo build` | n/a | pending |

*Note: Phase 5 is an integration/refactoring phase — most verification is manual browser testing*

---

## Wave 0 Requirements

- [ ] No new test files needed — existing player test suite validates renderer exports
- [ ] Build must succeed: `pnpm turbo build`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live preview renders via player | APP-01 | Requires running Next.js dev server + video input | Load video in apps/web, verify preview canvas renders |
| HTML export plays back standalone | APP-02 | Requires browser opening exported file | Export HTML, open in browser, verify playback works |
| APNG/SVG/ANSI/WebGPU export | APP-03 | Requires manual export + format-specific viewers | Export each format, verify output correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
