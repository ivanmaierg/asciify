import type { AsciiFrame } from './ascii-engine'
import type { ColorMode } from './constants'
import type { EncodedFrame } from './delta-encoder'
import { deltaEncode } from './delta-encoder'

export interface AsciiPlayerMetadata {
  columns: number
  rows: number
  fps: number
  duration: number
  frameCount: number
  colorMode: ColorMode
  charset: string
}

export interface AsciiPlayerData {
  version: 1
  metadata: AsciiPlayerMetadata
  frames: AsciiFrame[]
}

export interface AsciiPlayerDataCompact {
  version: 1
  metadata: AsciiPlayerMetadata
  frames: EncodedFrame[]
}

export function createPlayerData(
  frames: AsciiFrame[],
  metadata: Omit<AsciiPlayerMetadata, 'frameCount' | 'rows'>,
): AsciiPlayerData {
  const rows = frames[0]?.cells.length ?? 0
  return {
    version: 1,
    metadata: { ...metadata, frameCount: frames.length, rows },
    frames,
  }
}

export function compressPlayerData(
  data: AsciiPlayerData,
  keyframeInterval = 10,
): AsciiPlayerDataCompact {
  const rawTexts = data.frames.map((f) => f.text)
  const { frames } = deltaEncode(rawTexts, keyframeInterval)
  return {
    version: 1,
    metadata: data.metadata,
    frames,
  }
}
