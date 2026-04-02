import { describe, it, expect } from 'vitest'
import { createPlayerData, compressPlayerData } from '../src/player-data'
import type { AsciiFrame } from '../src/ascii-engine'

function makeFakeFrame(text: string, cols: number, rows: number): AsciiFrame {
  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      char: text[r * (cols + 1) + c] ?? ' ',
      r: 128,
      g: 128,
      b: 128,
      brightness: 128,
    })),
  )
  return { text, cells }
}

const baseMetadata = {
  fps: 24,
  duration: 1.0,
  colorMode: 'monochrome' as const,
  charset: ' .:-=+*#%@',
  columns: 10,
}

describe('createPlayerData', () => {
  it('returns an object with version: 1', () => {
    const frames = [makeFakeFrame('aaaaaaaaaa', 10, 1)]
    const result = createPlayerData(frames, baseMetadata)
    expect(result.version).toBe(1)
  })

  it('computes frameCount from frames.length', () => {
    const frames = [
      makeFakeFrame('aaaaaaaaaa', 10, 1),
      makeFakeFrame('bbbbbbbbbb', 10, 1),
      makeFakeFrame('cccccccccc', 10, 1),
    ]
    const result = createPlayerData(frames, baseMetadata)
    expect(result.metadata.frameCount).toBe(3)
  })

  it('computes rows from frames[0].cells.length', () => {
    const frame = makeFakeFrame('aaaaaaaaaa\nbbbbbbbbbb', 10, 2)
    const result = createPlayerData([frame], baseMetadata)
    expect(result.metadata.rows).toBe(2)
  })

  it('preserves provided metadata fields', () => {
    const frames = [makeFakeFrame('aaaaaaaaaa', 10, 1)]
    const result = createPlayerData(frames, baseMetadata)
    expect(result.metadata.fps).toBe(24)
    expect(result.metadata.duration).toBe(1.0)
    expect(result.metadata.colorMode).toBe('monochrome')
    expect(result.metadata.charset).toBe(' .:-=+*#%@')
    expect(result.metadata.columns).toBe(10)
  })

  it('handles empty frames array: sets rows: 0, frameCount: 0', () => {
    const result = createPlayerData([], baseMetadata)
    expect(result.metadata.frameCount).toBe(0)
    expect(result.metadata.rows).toBe(0)
    expect(result.version).toBe(1)
  })

  it('stores frames reference in output', () => {
    const frames = [makeFakeFrame('aaaaaaaaaa', 10, 1)]
    const result = createPlayerData(frames, baseMetadata)
    expect(result.frames).toBe(frames)
  })
})

describe('compressPlayerData', () => {
  it('returns an object with version: 1', () => {
    const frames = [makeFakeFrame('aaaaaaaaaa', 10, 1)]
    const data = createPlayerData(frames, baseMetadata)
    const result = compressPlayerData(data)
    expect(result.version).toBe(1)
  })

  it('preserves metadata from input', () => {
    const frames = [makeFakeFrame('aaaaaaaaaa', 10, 1)]
    const data = createPlayerData(frames, baseMetadata)
    const result = compressPlayerData(data)
    expect(result.metadata).toEqual(data.metadata)
  })

  it('produces a frames array of the same length as input frames', () => {
    const frames = [
      makeFakeFrame('aaaaaaaaaa', 10, 1),
      makeFakeFrame('bbbbbbbbbb', 10, 1),
      makeFakeFrame('cccccccccc', 10, 1),
    ]
    const data = createPlayerData(frames, baseMetadata)
    const result = compressPlayerData(data)
    expect(result.frames).toHaveLength(3)
  })

  it('returns empty frames array for empty input', () => {
    const data = createPlayerData([], baseMetadata)
    const result = compressPlayerData(data)
    expect(result.frames).toHaveLength(0)
  })

  it('first frame is always a keyframe (string type)', () => {
    const frames = [
      makeFakeFrame('aaaaaaaaaa', 10, 1),
      makeFakeFrame('bbbbbbbbbb', 10, 1),
    ]
    const data = createPlayerData(frames, baseMetadata)
    const result = compressPlayerData(data)
    expect(typeof result.frames[0]).toBe('string')
  })

  it('subsequent frames are delta patches (arrays) when frames are identical', () => {
    const frame = makeFakeFrame('aaaaaaaaaa', 10, 1)
    const frames = [frame, frame, frame]
    const data = createPlayerData(frames, baseMetadata)
    const result = compressPlayerData(data)
    // With identical frames, subsequent frames should be empty delta arrays
    expect(Array.isArray(result.frames[1])).toBe(true)
    expect(Array.isArray(result.frames[2])).toBe(true)
  })

  it('accepts custom keyframe interval', () => {
    const frames = Array.from({ length: 6 }, (_, i) =>
      makeFakeFrame(`frame-${i}---`, 10, 1),
    )
    const data = createPlayerData(frames, baseMetadata)
    // With keyframeInterval=2, indices 0, 2, 4 are keyframes
    const result = compressPlayerData(data, 2)
    expect(typeof result.frames[0]).toBe('string')
    expect(typeof result.frames[2]).toBe('string')
    expect(typeof result.frames[4]).toBe('string')
  })
})
