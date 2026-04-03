# Phase 6: Publishing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 06-publishing
**Areas discussed:** Demo site approach

---

## Scope Reduction

User explicitly stated: "for now i dont want to publish anything. i just wanna to see if the pretext thing and the exports works"

Phase 6 reduced to PUB-05 (demo/playground) only. All other requirements deferred.

---

## Demo Site Location

| Option | Description | Selected |
|--------|-------------|----------|
| Page in apps/web (Recommended) | Add /demo route to existing Next.js app | ✓ |
| Standalone static site | New apps/demo with Astro or plain HTML | |
| GitHub Pages + index.html | Single HTML file using IIFE from CDN | |

**User's choice:** Page in apps/web

---

## Demo Content

| Option | Description | Selected |
|--------|-------------|----------|
| Mode showcase + copy-paste snippets | Live player instances per mode with copy buttons | |
| Full playground | Interactive editor, paste own data, configure all options | ✓ |
| Minimal examples only | One example per mode, no interactivity | |

**User's choice:** Full playground

---

## Demo Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-converted sample data | Ship 2-3 small JSON files | |
| Live conversion on page | Users drop video, convert + play in browser | ✓ |

**User's choice:** Live conversion on page

## Claude's Discretion

- Playground UI layout and controls
- Which player options to expose
- Progress indicator during conversion
- Whether to include HTML export test button

## Deferred Ideas

- npm publishing (PUB-01, PUB-02, PUB-03, PUB-04)
- CDN distribution (PUB-06)
- CI pipeline (TEST-06)
