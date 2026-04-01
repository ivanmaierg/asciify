export const CHARACTER_SETS = {
  minimal: ' .:-=+*#%@',
  standard:
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  dense: " .`-_':,;^=+/|)\\!ct7?J3]oiz{xnuvs2eaS5FkPGbdqhRBEHM9KW&N#@",
  emoji: ' ░▒▓█',
} as const

export type CharacterSetName = keyof typeof CHARACTER_SETS | 'custom'

export type ColorMode = 'monochrome' | 'colored' | 'inverted'

export type PlaybackState = 'empty' | 'loading' | 'paused' | 'playing'

export type ExportLoop = 'forever' | 'once' | number

export const FONT_PRESETS = [
  'Courier New',
  'Menlo',
  'Consolas',
  'Monaco',
  'monospace',
] as const

export const FPS_OPTIONS = [6, 12, 24, 30] as const

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
  exportFps: 24,
  exportLoop: 'forever' as ExportLoop,
  exportAutoplay: true,
  exportCanvasWidth: 640,
  exportShowControls: true,
} as const
