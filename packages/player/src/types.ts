import type { AsciiPlayerData, AsciiPlayerDataCompact } from '@asciify/encoder'

export type LoopMode = 'forever' | 'once' | number

export type RenderMode = 'grid'  // Phase 4 adds 'proportional' | 'typewriter'

export interface AsciiPlayerOptions {
  fps?: number
  loop?: LoopMode
  autoplay?: boolean
  font?: string              // CSS font shorthand, default '14px monospace'
  fgColor?: string           // foreground color, default '#00ff00'
  bgColor?: string           // background color, default '#000000'
  mode?: RenderMode
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
}

export interface AsciiPlayerTheme {
  name: string
  fgColor: string
  bgColor: string
}

export const THEMES: Record<string, AsciiPlayerTheme> = {
  'green-on-black': { name: 'green-on-black', fgColor: '#00ff00', bgColor: '#000000' },
  'matrix': { name: 'matrix', fgColor: '#00ff41', bgColor: '#0d0208' },
  'amber': { name: 'amber', fgColor: '#ffb000', bgColor: '#1a1200' },
  'white-on-black': { name: 'white-on-black', fgColor: '#ffffff', bgColor: '#000000' },
  'blue': { name: 'blue', fgColor: '#00bfff', bgColor: '#000a14' },
}

// Internal types used across modules
export type PlayerInputData = AsciiPlayerData | AsciiPlayerDataCompact
