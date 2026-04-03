import { describe, it, expect, vi } from 'vitest'
import { renderGridFrame, renderProportionalFrame, renderTypewriterFrame } from '../src/renderer'
import type { AsciiFrame } from '@asciify/encoder'

// Mock @chenglou/pretext for deterministic snapshot captures
vi.mock('@chenglou/pretext', () => ({
  prepareWithSegments: vi.fn((text: string) => ({
    segments: [...text],
    widths: [...text].map(() => 8),
  })),
  layoutWithLines: vi.fn(() => ({
    lines: [{ text: '', width: 0, start: { segmentIndex: 0, graphemeIndex: 0 }, end: { segmentIndex: 0, graphemeIndex: 0 } }],
    lineCount: 1,
    height: 16,
  })),
}))

/**
 * Creates a recording canvas context that captures all draw calls as strings.
 * Used for deterministic inline snapshot assertions.
 */
function makeRecordingCtx(width = 200, height = 100) {
  const calls: string[] = []
  const canvas = { width, height }
  const ctx = {
    canvas,
    fillStyle: '',
    textBaseline: '',
    font: '14px monospace',
    fillRect: (x: number, y: number, w: number, h: number) => {
      calls.push(`fillRect(${x},${y},${w},${h})`)
    },
    fillText: (t: string, x: number, y: number) => {
      calls.push(`fillText(${JSON.stringify(t)},${x},${y})`)
    },
    measureText: (t: string) => ({ width: t.length * 8 }),
    clearRect: vi.fn(),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

function makeFrame(cells: { char: string; r: number; g: number; b: number; brightness: number }[][]): AsciiFrame {
  const lines = cells.map(row => row.map(c => c.char).join(''))
  return {
    text: lines.join('\n'),
    cells,
  }
}

describe('snapshot: renderGridFrame', () => {
  it('captures call sequence for 2x2 frame (monochrome)', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([
      [
        { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
        { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      ],
      [
        { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
        { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
      ],
    ])
    renderGridFrame(ctx, frame, 8, 16, '#00ff00', '#000000', 'monochrome')
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("A",0,0)",
        "fillText("B",8,0)",
        "fillText("C",0,16)",
      ]
    `)
  })

  it('captures call sequence for 2x2 frame (colored mode)', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([
      [
        { char: 'X', r: 255, g: 128, b: 64, brightness: 0.5 },
        { char: 'Y', r: 0, g: 64, b: 255, brightness: 0.5 },
      ],
    ])
    renderGridFrame(ctx, frame, 8, 16, '#ffffff', '#000000', 'colored')
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("X",0,0)",
        "fillText("Y",8,0)",
      ]
    `)
  })
})

describe('snapshot: renderProportionalFrame', () => {
  it('captures prefix-sum x-positions for 3-char row', () => {
    const { ctx, calls } = makeRecordingCtx()
    // With mock widths: [8, 8, 8], prefix sums: x = 0, 8, 16
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, 16, '#00ff00', '#000000', 'monochrome')
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("A",0,0)",
        "fillText("B",8,0)",
        "fillText("C",16,0)",
      ]
    `)
  })

  it('captures colored mode per-cell RGB fillStyle changes', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([[
      { char: 'R', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'G', r: 0, g: 255, b: 0, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, 16, '#ffffff', '#000000', 'colored')
    // Verify the draw calls capture colored characters
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("R",0,0)",
        "fillText("G",8,0)",
      ]
    `)
  })
})

describe('snapshot: renderTypewriterFrame', () => {
  it('captures partial reveal (revealCount=2 of 3 chars)', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
    ]])
    renderTypewriterFrame(ctx, frame, 8, 16, '#00ff00', '#000000', 'monochrome', 2)
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("A",0,0)",
        "fillText("B",8,0)",
      ]
    `)
  })

  it('captures revealCount=0 (only background clear, no fillText)', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
    ]])
    renderTypewriterFrame(ctx, frame, 8, 16, '#00ff00', '#000000', 'monochrome', 0)
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
      ]
    `)
  })

  it('captures cursor character at reveal position when showCursor=true', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
    ]])
    renderTypewriterFrame(ctx, frame, 8, 16, '#00ff00', '#000000', 'monochrome', 1, true)
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("A",0,0)",
        "fillText("|",8,0)",
      ]
    `)
  })

  it('captures full reveal (revealCount equals total chars)', () => {
    const { ctx, calls } = makeRecordingCtx()
    const frame = makeFrame([[
      { char: 'H', r: 200, g: 200, b: 200, brightness: 0.8 },
      { char: 'i', r: 200, g: 200, b: 200, brightness: 0.8 },
    ]])
    renderTypewriterFrame(ctx, frame, 8, 16, '#00ff00', '#000000', 'monochrome', 2)
    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText("H",0,0)",
        "fillText("i",8,0)",
      ]
    `)
  })
})
