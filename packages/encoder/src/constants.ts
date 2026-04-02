export const CHARACTER_SETS = {
  minimal: ' .:-=+*#%@',
  standard:
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  dense: " .`-_':,;^=+/|)\\!ct7?J3]oiz{xnuvs2eaS5FkPGbdqhRBEHM9KW&N#@",
  emoji: ' ░▒▓█',
} as const

export type CharacterSetName = keyof typeof CHARACTER_SETS | 'custom'

export type ColorMode = 'monochrome' | 'colored' | 'inverted' | 'monoscale'

export type DitherMode = 'none' | 'floyd-steinberg' | 'ordered'

export const DEFAULT_SETTINGS = {
  characterSet: 'standard' as CharacterSetName,
  customCharacters: '',
  columns: 80,
  brightnessThreshold: 0,
  contrastBoost: 100,
  colorMode: 'monochrome' as ColorMode,
  foregroundColor: '#00ff00',
  backgroundColor: '#000000',
  fontFamily: 'Courier New',
  fontSize: 12,
  frameSkip: 1,
  invertCharset: false,
  gamma: 1.0,
  edgeDetection: 0,
  ditherMode: 'none' as DitherMode,
  exportFps: 24,
  exportLoop: 'forever' as const,
  exportAutoplay: true,
  exportCanvasWidth: 640,
  exportShowControls: true,
} as const
