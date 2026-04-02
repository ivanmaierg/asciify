---
phase: 1
slug: monorepo-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell commands (no test framework — infra phase) |
| **Config file** | turbo.json (created in this phase) |
| **Quick run command** | `pnpm --filter web dev --port 3001 & sleep 5 && curl -s http://localhost:3001 > /dev/null && kill %1` |
| **Full suite command** | `pnpm build && pnpm --filter web dev --port 3001 & sleep 5 && curl -s http://localhost:3001 > /dev/null && kill %1` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Verify file structure exists
- **After every plan wave:** Run full build verification
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MONO-01 | structural | `test -f pnpm-workspace.yaml` | ⬜ | ⬜ pending |
| TBD | TBD | TBD | MONO-02 | structural | `test -f turbo.json` | ⬜ | ⬜ pending |
| TBD | TBD | TBD | MONO-03 | integration | `pnpm --filter web dev` | ⬜ | ⬜ pending |
| TBD | TBD | TBD | MONO-04 | structural | `test -f tsconfig.base.json` | ⬜ | ⬜ pending |
| TBD | TBD | TBD | MONO-05 | structural | `test -f pnpm-lock.yaml && ! test -f package-lock.json` | ⬜ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is an infrastructure phase that creates its own test conditions.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App behaves identically | MONO-03 | Visual verification of UI | Open browser, verify ASCII converter loads and functions |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
