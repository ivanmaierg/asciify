import type { AsciiFrame } from '@/lib/ascii-engine'
import { convertFrameInWorker, terminateWorker } from '@/lib/ascii-worker'
import { CHARACTER_SETS } from '@/lib/constants'
import type { CharacterSetName, ColorMode } from '@/lib/constants'

export interface FrameExtractionConfig {
  videoUrl: string
  videoDuration: number
  frameRate: number
  frameSkip: number
  columns: number
  characterSet: CharacterSetName
  customCharacters: string
  brightnessThreshold: number
  contrastBoost: number
  colorMode: ColorMode
}

export interface ExtractedFrames {
  frames: AsciiFrame[]
  videoWidth: number
  videoHeight: number
  rows: number
  columns: number
}

function getCharset(name: CharacterSetName, custom: string): string {
  if (name === 'custom') return custom || CHARACTER_SETS.standard
  return CHARACTER_SETS[name]
}

export async function extractFrames(
  config: FrameExtractionConfig,
  onProgress: (progress: number) => void,
): Promise<ExtractedFrames> {
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.playsInline = true
  video.src = config.videoUrl

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Failed to load video'))
  })

  const MAX_SOURCE_WIDTH = 720
  const scale = Math.min(1, MAX_SOURCE_WIDTH / video.videoWidth)
  const extractionCanvas = document.createElement('canvas')
  extractionCanvas.width = Math.round(video.videoWidth * scale)
  extractionCanvas.height = Math.round(video.videoHeight * scale)
  const ectx = extractionCanvas.getContext('2d', { willReadFrequently: true })!

  const charset = getCharset(config.characterSet, config.customCharacters)
  const frameDuration = (1 / config.frameRate) * config.frameSkip
  const totalFrames = Math.floor(config.videoDuration / frameDuration)
  const frames: AsciiFrame[] = []
  let rows = 0

  for (let i = 0; i < totalFrames; i++) {
    video.currentTime = i * frameDuration
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })

    ectx.drawImage(video, 0, 0, extractionCanvas.width, extractionCanvas.height)
    const imageData = ectx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height)

    // Convert in worker thread
    const result = await convertFrameInWorker(
      imageData,
      config.columns,
      charset,
      config.brightnessThreshold,
      config.contrastBoost,
      config.colorMode,
    )

    frames.push(result)
    if (i === 0) rows = result.cells.length

    onProgress((i + 1) / totalFrames)
  }

  // Cleanup
  video.removeAttribute('src')
  video.load()
  terminateWorker()

  return {
    frames,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    rows,
    columns: config.columns,
  }
}
