# Phase 3: Player Scaffold + Grid Mode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-player-scaffold-grid-mode
**Areas discussed:** Web Component API, ES Module API, Rendering approach, Playback engine, Data decompression, Package structure & build

---

## Web Component API

### Data Loading
| Option | Description | Selected |
|--------|-------------|----------|
| src attribute (URL fetch) | Like `<video src>` — player fetches JSON from URL | |
| src + inline data property | src for URL fetch, plus .data JS property for direct objects | |
| You decide | Claude picks best approach | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion

### Shadow DOM
| Option | Description | Selected |
|--------|-------------|----------|
| Open Shadow DOM | Encapsulates canvas + controls, prevents style leaks | |
| Light DOM | No shadow boundary, host CSS can affect player | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### Controls Bar
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — play/pause + progress bar | Stripped-down video player, styleable via CSS custom properties | |
| Full — play/pause + seek + time + FPS | More controls visible by default | |
| You decide | Claude designs based on common patterns | ✓ |

**User's choice:** You decide

### Theming
| Option | Description | Selected |
|--------|-------------|----------|
| fg/bg attributes + named themes | Attributes for custom, theme for presets | |
| CSS custom properties only | --ascii-fg, --ascii-bg, no theme attribute | |
| Both: attributes + CSS fallback | Attributes take priority, CSS as fallback, named themes set both | ✓ |

**User's choice:** Both: attributes + CSS fallback

### Sizing
| Option | Description | Selected |
|--------|-------------|----------|
| Width-driven auto-height | Container width, calculated height from aspect ratio | |
| Explicit width + height attributes | User sets both dimensions | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### Error Handling
| Option | Description | Selected |
|--------|-------------|----------|
| Silent with error event | Dispatch error event, canvas stays blank | |
| Visual error + event | Show error on canvas + dispatch event | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### IIFE Build
| Option | Description | Selected |
|--------|-------------|----------|
| Include IIFE output now | ESM + CJS + IIFE from day one | |
| Defer IIFE to Phase 6 | Focus on ESM + CJS for now | |
| You decide | Claude decides | ✓ |

**User's choice:** You decide

### Attribute Reactivity
| Option | Description | Selected |
|--------|-------------|----------|
| observedAttributes with live updates | Changing attrs on playing element takes immediate effect | |
| Set once, require reset | Attributes read only on connectedCallback | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

---

## ES Module API

### Constructor
| Option | Description | Selected |
|--------|-------------|----------|
| new AsciiPlayer(canvas, data, options) | Direct canvas element, data object, options bag | ✓ |
| new AsciiPlayer(container, data, options) | Pass a div, player creates its own canvas | |
| You decide | Claude picks | |

**User's choice:** new AsciiPlayer(canvas, data, options)

### API Parity
| Option | Description | Selected |
|--------|-------------|----------|
| Same names, camelCase | Web Component attrs map to ES Module camelCase options | ✓ |
| ES Module has richer options | Additional options not available as attributes | |
| You decide | Claude picks | |

**User's choice:** Same names, camelCase

### State Exposure
| Option | Description | Selected |
|--------|-------------|----------|
| Properties + events (HTMLMediaElement) | addEventListener pattern | |
| Callback-based | onTimeUpdate, onEnded in options | |
| Both: EventTarget + callbacks | addEventListener AND onX callbacks | ✓ |

**User's choice:** Both: EventTarget + callbacks

### Lifecycle
| Option | Description | Selected |
|--------|-------------|----------|
| player.destroy() | Stops, cancels rAF, clears canvas, removes listeners | ✓ |
| You decide | Claude handles cleanup | |

**User's choice:** player.destroy()

### Export Surface
| Option | Description | Selected |
|--------|-------------|----------|
| AsciiPlayer + type exports only | Main class + TypeScript types | ✓ |
| AsciiPlayer + standalone render function | Also export renderFrame() for single-frame rendering | |
| You decide | Claude decides | |

**User's choice:** AsciiPlayer + type exports only

### Input Format
| Option | Description | Selected |
|--------|-------------|----------|
| Both formats, auto-detect | Accepts AsciiPlayerData and AsciiPlayerDataCompact | ✓ |
| AsciiPlayerData only | Only uncompressed format | |
| You decide | Claude picks | |

**User's choice:** Both formats, auto-detect

### URL Loading
| Option | Description | Selected |
|--------|-------------|----------|
| Static method: AsciiPlayer.fromURL() | Factory method that fetches, parses, constructs | |
| Constructor only, user fetches | User does fetch + parse, passes to constructor | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### Dependency Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Peer dependency | User installs both encoder + player | ✓ |
| Bundled dependency | Player bundles encoder types internally | |
| You decide | Claude picks | |

**User's choice:** Peer dependency

### Font Guard
| Option | Description | Selected |
|--------|-------------|----------|
| Async init with ready promise | Constructor returns immediately, player.ready is a Promise | ✓ |
| Constructor blocks on font load | Factory pattern: AsciiPlayer.create() | |
| You decide | Claude picks | |

**User's choice:** Async init with ready promise

---

## Rendering Approach

### Renderer Origin
| Option | Description | Selected |
|--------|-------------|----------|
| Start fresh inside player | Clean implementation using pretext APIs | ✓ |
| Extract and adapt pretext-renderer.ts | Move existing renderer, refactor | |
| You decide | Claude picks | |

**User's choice:** Start fresh inside player

### Grid Engine
| Option | Description | Selected |
|--------|-------------|----------|
| pretext for all modes including grid | Consistent code path, prepare() + layoutWithLines() | ✓ |
| Simple fillText for grid, pretext for proportional | Direct canvas for grid, pretext only for Phase 4 modes | |
| You decide | Claude picks | |

**User's choice:** pretext for all modes including grid

### Color Rendering
| Option | Description | Selected |
|--------|-------------|----------|
| Per-cell color from AsciiCell data | Read each cell's r/g/b and fillText individually | ✓ |
| Line-by-line for mono, per-cell for colored | Fast path for monochrome + fallback for colored | |
| You decide | Claude picks | |

**User's choice:** Per-cell color from AsciiCell data

---

## Playback Engine

### FPS Loop
| Option | Description | Selected |
|--------|-------------|----------|
| rAF + time delta | requestAnimationFrame checks elapsed time | ✓ |
| setInterval | Fixed interval at 1000/fps ms | |
| You decide | Claude picks | |

**User's choice:** rAF + time delta

### Seeking
| Option | Description | Selected |
|--------|-------------|----------|
| seekTo(seconds) | Jump by timestamp, immediate render | |
| seekToFrame(index) | Jump by frame number | |
| Both methods | seekTo(seconds) + seekToFrame(index) | ✓ |

**User's choice:** Both methods

### timeupdate Frequency
| Option | Description | Selected |
|--------|-------------|----------|
| Every frame | Fire on each rendered frame | |
| ~4x/second | Match HTMLMediaElement standard | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### End Behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Stay on last frame + fire 'ended' | Canvas shows final frame | |
| Clear canvas + fire 'ended' | Canvas goes blank | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

---

## Data Decompression

### Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Eager: all frames on load | Convert all compressed frames at load time | |
| Lazy: on demand | Decompress as needed during playback | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide

### Utility Source
| Option | Description | Selected |
|--------|-------------|----------|
| Import from @asciify/encoder | Use rleDecode as peer dep import | ✓ |
| Duplicate in player | Copy decompression logic, no encoder dep | |
| You decide | Claude picks | |

**User's choice:** Import from @asciify/encoder

---

## Package Structure & Build

### Pretext Bundling
| Option | Description | Selected |
|--------|-------------|----------|
| tsup noExternal | Inline pretext into dist bundle | ✓ |
| Copy source (vendor) | Vendor pretext source directly | |
| You decide | Claude picks | |

**User's choice:** tsup noExternal

### File Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Feature modules | player.ts, renderer.ts, playback.ts, web-component.ts, types.ts, index.ts | ✓ |
| Flat structure | Everything in src/ | |
| You decide | Claude organizes | |

**User's choice:** Feature modules

### Build Output
| Option | Description | Selected |
|--------|-------------|----------|
| ESM + CJS + IIFE + types | Full coverage from day one | ✓ |
| ESM + types only | Modern-only, add others in Phase 6 | |
| You decide | Claude picks | |

**User's choice:** ESM + CJS + IIFE + types

---

## Claude's Discretion

- Shadow DOM strategy
- Controls bar design
- Data loading (src attr + .data property)
- Responsive sizing (width-driven auto-height)
- Error handling (visual + event)
- IIFE build inclusion
- Attribute reactivity (observedAttributes)
- URL loading static method
- timeupdate event frequency
- End-of-playback behavior
- Decompression strategy (eager vs lazy)

## Deferred Ideas

None — discussion stayed within phase scope
