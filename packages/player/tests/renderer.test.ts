import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderGridFrame } from '../src/renderer'
import type { AsciiFrame } from '@asciify/encoder'

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
