import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderGridFrame, renderProportionalFrame } from '../src/renderer'
import type { AsciiFrame } from '@asciify/encoder'

// Mock @chenglou/pretext so tests run without a real canvas measurement environment
vi.mock('@chenglou/pretext', () => ({
  prepareWithSegments: vi.fn((text: string) => ({
    segments: [...text],
    widths: [...text].map(() => 8), // 8px per segment for deterministic tests
  })),
  layoutWithLines: vi.fn(() => ({
    lines: [{ text: '', width: 0, start: { segmentIndex: 0, graphemeIndex: 0 }, end: { segmentIndex: 0, graphemeIndex: 0 } }],
    lineCount: 1,
    height: 16,
  })),
}))

// Mock canvas 2d context
function makeMockCtx(width = 200, height = 100) {
  const canvas = { width, height }
  const ctx = {
    canvas,
    fillStyle: '',
    textBaseline: '',
    font: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
  }
  return ctx as unknown as CanvasRenderingContext2D
}

function makeFrame(cells: { char: string; r: number; g: number; b: number; brightness: number }[][]): AsciiFrame {
  const lines = cells.map(row => row.map(c => c.char).join(''))
  return {
    text: lines.join('\n'),
    cells,
  }
}

describe('renderGridFrame', () => {
  const charWidth = 8
  const lineHeight = 16
  const fgColor = '#00ff00'
  const bgColor = '#000000'

  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = makeMockCtx(200, 100)
  })

  it('calls ctx.fillRect once for background clear', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, ctx.canvas.width, ctx.canvas.height)
  })

  it('calls ctx.fillText for each non-space cell in frame', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monochrome')
    // Only 2 non-space cells should be drawn
    expect(ctx.fillText).toHaveBeenCalledTimes(2)
  })

  it('positions cell at (col * charWidth, row * lineHeight)', () => {
    const frame = makeFrame([
      [
        { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
        { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      ],
      [
        { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
        { char: 'D', r: 100, g: 100, b: 100, brightness: 0.5 },
      ],
    ])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillText).toHaveBeenCalledWith('A', 0 * charWidth, 0 * lineHeight)
    expect(ctx.fillText).toHaveBeenCalledWith('B', 1 * charWidth, 0 * lineHeight)
    expect(ctx.fillText).toHaveBeenCalledWith('C', 0 * charWidth, 1 * lineHeight)
    expect(ctx.fillText).toHaveBeenCalledWith('D', 1 * charWidth, 1 * lineHeight)
  })

  it('uses cell RGB color when colorMode is "colored"', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 128, b: 64, brightness: 0.5 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'colored')
    expect((ctx as { fillStyle: string }).fillStyle).toBe('rgb(255,128,64)')
  })

  it('uses cell RGB color when colorMode is "monoscale"', () => {
    const frame = makeFrame([[
      { char: '#', r: 200, g: 200, b: 200, brightness: 0.8 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monoscale')
    expect((ctx as { fillStyle: string }).fillStyle).toBe('rgb(200,200,200)')
  })

  it('uses fgColor when colorMode is "monochrome"', () => {
    const frame = makeFrame([[
      { char: 'X', r: 100, g: 100, b: 100, brightness: 0.5 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monochrome')
    expect((ctx as { fillStyle: string }).fillStyle).toBe(fgColor)
  })

  it('uses fgColor when colorMode is "inverted"', () => {
    const frame = makeFrame([[
      { char: 'X', r: 100, g: 100, b: 100, brightness: 0.5 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'inverted')
    expect((ctx as { fillStyle: string }).fillStyle).toBe(fgColor)
  })

  it('skips cells where char is " "', () => {
    const frame = makeFrame([[
      { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
      { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
      { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
    ]])
    renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillText).not.toHaveBeenCalled()
  })
})

describe('renderProportionalFrame', () => {
  const lineHeight = 16
  const fgColor = '#00ff00'
  const bgColor = '#000000'

  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = makeMockCtx(200, 100)
    vi.clearAllMocks()
  })

  it('calls fillRect once for background clear', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, ctx.canvas.width, ctx.canvas.height)
  })

  it('calls fillText for each non-space cell', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: ' ', r: 0, g: 0, b: 0, brightness: 0 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillText).toHaveBeenCalledTimes(2)
  })

  it('positions characters using pretext widths[] prefix sums (not ctx.measureText)', () => {
    // With widths: [8, 8, 8], prefix sums give x = 0, 8, 16
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 0, b: 0, brightness: 0.5 },
      { char: 'B', r: 0, g: 255, b: 0, brightness: 0.5 },
      { char: 'C', r: 0, g: 0, b: 255, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')
    expect(ctx.fillText).toHaveBeenCalledWith('A', 0, 0)
    expect(ctx.fillText).toHaveBeenCalledWith('B', 8, 0)
    expect(ctx.fillText).toHaveBeenCalledWith('C', 16, 0)
  })

  it('uses cell RGB when colorMode is "colored"', () => {
    const frame = makeFrame([[
      { char: 'A', r: 255, g: 128, b: 64, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'colored')
    expect((ctx as { fillStyle: string }).fillStyle).toBe('rgb(255,128,64)')
  })

  it('uses fgColor when colorMode is "monochrome"', () => {
    const frame = makeFrame([[
      { char: 'X', r: 100, g: 100, b: 100, brightness: 0.5 },
    ]])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')
    expect((ctx as { fillStyle: string }).fillStyle).toBe(fgColor)
  })

  it('stops rendering when x >= canvas.width (D-02 clip)', () => {
    // Canvas width 200, each char is 8px wide, so chars 0..24 fit (x=0..192), char at x=200 does not
    const wideCells = Array.from({ length: 30 }, (_, i) => ({
      char: 'X',
      r: 100, g: 100, b: 100, brightness: 0.5,
    }))
    const frame = makeFrame([wideCells])
    renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')
    // Canvas width=200, char width=8: positions 0,8,...,192 fit (25 chars), 200 does not
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls
    // All drawn chars should have x < 200
    for (const call of calls) {
      expect(call[1]).toBeLessThan(200)
    }
  })

  it('handles empty frame (cells = [])', () => {
    const frame = makeFrame([])
    expect(() => renderProportionalFrame(ctx, frame, lineHeight, fgColor, bgColor, 'monochrome')).not.toThrow()
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.fillText).not.toHaveBeenCalled()
  })
})
