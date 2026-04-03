# Phase 4: Player Rendering Modes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 04-player-rendering-modes
**Areas discussed:** Proportional font rendering, Scroll trigger & extras

---

## Proportional Font Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| pre-wrap (Recommended) | Preserve original line breaks, pretext positions characters with variable widths | |
| Word-wrap reflow | Let pretext reflow text to fit canvas width | |
| You decide | Claude picks based on pretext API capabilities | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on whitespace strategy

---

### Overflow Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Clip silently | Cut off at canvas edge | ✓ |
| Auto-shrink font | Reduce font size until longest line fits | |
| Horizontal scroll | Allow horizontal scrolling within player | |

**User's choice:** Clip silently

---

### Per-cell Coloring

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per-cell color (Recommended) | Each character gets own color from AsciiCell data | ✓ |
| Line-level color only | Entire line gets one color | |

**User's choice:** Yes, per-cell color

---

## Scroll Trigger & Extras

### Replay on Re-enter

| Option | Description | Selected |
|--------|-------------|----------|
| Replay on re-enter (Recommended) | Reset and play again each time element scrolls into view | ✓ |
| Play once only | First scroll-in triggers, subsequent re-entries do nothing | |
| Configurable | Add replay attribute for flexibility | |

**User's choice:** Replay on re-enter

---

### Additional Trigger Modes

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll only (Recommended) | Keep simple for v1 | |
| Scroll + hover + click | Three trigger modes for broader use cases | ✓ |
| You decide | Claude picks based on complexity | |

**User's choice:** Scroll + hover + click
**Notes:** User wants all three trigger types for a comprehensive player library

---

### Named Themes

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing 5 (Recommended) | XTRA-01 already satisfied by Phase 3 themes | ✓ |
| Add more themes | Expand to 8-10 themes | |
| Add custom theme API | registerTheme() for user-defined themes | |

**User's choice:** Keep existing 5

---

## Claude's Discretion

- Proportional font whitespace strategy (pre-wrap vs word-wrap)
- Typewriter animation details (cursor, easing, granularity, timestamp format)
- Trigger implementation details (thresholds, hover/click behavior)
- Test strategy details (snapshot format, Playwright setup, coverage targets)

## Deferred Ideas

None — discussion stayed within phase scope.
