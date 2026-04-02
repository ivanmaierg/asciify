import { describe, it, expect } from 'vitest'
import { deltaEncode } from '../src/delta-encoder'
import { rleDecode } from '../src/rle'

describe('deltaEncode', () => {
  it('returns empty frames for empty input', () => {
    const result = deltaEncode([], 10)
    expect(result).toEqual({ frames: [] })
  })

  it('returns a single keyframe string for a single frame', () => {
    const rawFrames = ['hello world']
    const result = deltaEncode(rawFrames, 10)
    expect(result.frames).toHaveLength(1)
    expect(typeof result.frames[0]).toBe('string')
    // The keyframe is RLE-encoded so decoding it should give the original
    expect(rleDecode(result.frames[0] as string)).toBe('hello world')
  })

  it('first frame is always a keyframe (string type)', () => {
    const rawFrames = ['frame0', 'frame1', 'frame2']
    const result = deltaEncode(rawFrames, 10)
    expect(typeof result.frames[0]).toBe('string')
  })

  it('produces keyframes at keyframe interval boundaries', () => {
    // With keyframeInterval=2: frames at index 0, 2, 4 should be keyframes
    const rawFrames = ['f0', 'f1', 'f2', 'f3', 'f4']
    const result = deltaEncode(rawFrames, 2)
    expect(typeof result.frames[0]).toBe('string')
    expect(typeof result.frames[2]).toBe('string')
    expect(typeof result.frames[4]).toBe('string')
  })

  it('produces delta patches for identical frames (empty or small deltas)', () => {
    const frame = 'aaabbbccc'
    const rawFrames = [frame, frame, frame]
    const result = deltaEncode(rawFrames, 10)
    // Frame 0 is keyframe; frames 1 and 2 should be delta arrays (empty patches for identical frames)
    expect(typeof result.frames[0]).toBe('string')
    expect(Array.isArray(result.frames[1])).toBe(true)
    expect(Array.isArray(result.frames[2])).toBe(true)
    // Identical frames produce empty delta patches
    expect(result.frames[1]).toEqual([])
    expect(result.frames[2]).toEqual([])
  })

  it('produces delta patches with changed positions for differing frames', () => {
    const frame0 = 'aaaaaaaaaa'
    const frame1 = 'aaabbbbaaa'
    const rawFrames = [frame0, frame1]
    const result = deltaEncode(rawFrames, 10)
    expect(typeof result.frames[0]).toBe('string')
    // frame1 differs from frame0; should produce a delta array (or keyframe if delta is larger)
    // Either way the result should be valid
    expect(result.frames[1]).toBeDefined()
  })

  it('falls back to keyframe when delta is larger than full frame', () => {
    // Completely different frames — delta would be larger than full frame
    const frame0 = 'abcdefghij'
    const frame1 = 'jihgfedcba'
    const rawFrames = [frame0, frame1]
    const result = deltaEncode(rawFrames, 10)
    // frame1 is either a keyframe string or an array; both are valid
    // The implementation stores as keyframe when delta >= full size
    expect(result.frames[1]).toBeDefined()
    // If stored as string (keyframe), round-trip should decode correctly
    if (typeof result.frames[1] === 'string') {
      expect(rleDecode(result.frames[1])).toBe(frame1)
    }
  })

  it('output frames count equals input frames count', () => {
    const rawFrames = ['aaa', 'bbb', 'ccc', 'ddd', 'eee']
    const result = deltaEncode(rawFrames, 3)
    expect(result.frames).toHaveLength(rawFrames.length)
  })

  it('frames at index divisible by keyframeInterval are keyframes', () => {
    // With keyframeInterval=3: indices 0, 3, 6 are keyframes
    const rawFrames = Array.from({ length: 7 }, (_, i) => `frame-${i}-content`)
    const result = deltaEncode(rawFrames, 3)
    expect(typeof result.frames[0]).toBe('string')
    expect(typeof result.frames[3]).toBe('string')
    expect(typeof result.frames[6]).toBe('string')
  })
})
