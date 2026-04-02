export type PlaybackState = 'empty' | 'loading' | 'paused' | 'playing'

export type ExportLoop = 'forever' | 'once' | number

export type ExportFormat = 'html' | 'webgpu' | 'apng' | 'svg' | 'ansi'

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  html: 'HTML',
  webgpu: 'WebGPU',
  apng: 'APNG',
  svg: 'SVG',
  ansi: 'ANSI',
}

export const FONT_PRESETS = [
  'Courier New',
  'Menlo',
  'Consolas',
  'Monaco',
  'monospace',
] as const

export const FPS_OPTIONS = [6, 12, 24, 30] as const
