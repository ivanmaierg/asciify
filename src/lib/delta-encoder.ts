import { rleEncode } from '@/lib/rle'

export type DeltaPatch = [number, string][] // [position, changedChars][]
export type EncodedFrame = string | DeltaPatch // string = keyframe (RLE), array = delta

export interface DeltaEncodedFrames {
  frames: EncodedFrame[]
}

export function deltaEncode(
  rawFrames: string[],
  keyframeInterval: number,
): DeltaEncodedFrames {
  if (rawFrames.length === 0) return { frames: [] }

  const frames: EncodedFrame[] = []

  for (let i = 0; i < rawFrames.length; i++) {
    if (i === 0 || i % keyframeInterval === 0) {
      // Keyframe: store full RLE-encoded text
      frames.push(rleEncode(rawFrames[i]))
    } else {
      // Delta: compare with previous frame
      const prev = rawFrames[i - 1]
      const curr = rawFrames[i]
      const patches: DeltaPatch = []

      let j = 0
      while (j < curr.length) {
        if (j >= prev.length || curr[j] !== prev[j]) {
          // Start of a changed region
          const start = j
          let run = ''
          while (j < curr.length && (j >= prev.length || curr[j] !== prev[j])) {
            run += curr[j]
            j++
          }
          patches.push([start, run])
        } else {
          j++
        }
      }

      // If delta is larger than full frame, store as keyframe instead
      const deltaSize = JSON.stringify(patches).length
      const fullSize = rleEncode(curr).length + 2 // +2 for quotes
      if (deltaSize >= fullSize) {
        frames.push(rleEncode(curr))
      } else {
        frames.push(patches)
      }
    }
  }

  return { frames }
}
