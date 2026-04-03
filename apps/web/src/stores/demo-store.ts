import { create } from 'zustand'
import type { CharacterSetName, ColorMode, AsciiPlayerDataCompact } from '@asciify/encoder'
import type { RenderMode, LoopMode } from '@asciify/player'

interface DemoState {
  // Video input
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number

  // Conversion settings
  columns: number
  characterSet: CharacterSetName
  colorMode: ColorMode
  fps: number

  // Conversion state
  isConverting: boolean
  convertProgress: number
  error: string | null

  // Result
  playerData: AsciiPlayerDataCompact | null

  // Player options (for Plan 02 consumption)
  renderMode: RenderMode
  theme: string
  loop: LoopMode
  charDelay: number

  // Actions
  setVideoFile: (file: File) => void
  setColumns: (n: number) => void
  setCharacterSet: (cs: CharacterSetName) => void
  setColorMode: (cm: ColorMode) => void
  setFps: (fps: number) => void
  setIsConverting: (v: boolean) => void
  setConvertProgress: (p: number) => void
  setError: (e: string | null) => void
  setPlayerData: (d: AsciiPlayerDataCompact | null) => void
  setRenderMode: (m: RenderMode) => void
  setTheme: (t: string) => void
  setLoop: (l: LoopMode) => void
  setCharDelay: (d: number) => void
  reset: () => void
}

const defaults = {
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  columns: 80,
  characterSet: 'standard' as CharacterSetName,
  colorMode: 'monochrome' as ColorMode,
  fps: 12,
  isConverting: false,
  convertProgress: 0,
  error: null,
  playerData: null,
  renderMode: 'grid' as RenderMode,
  theme: 'green-on-black',
  loop: 'forever' as LoopMode,
  charDelay: 30,
}

export const useDemoStore = create<DemoState>((set, get) => ({
  ...defaults,

  setVideoFile: (file) => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    const videoUrl = URL.createObjectURL(file)

    // Load video metadata to get duration
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = videoUrl
    video.onloadedmetadata = () => {
      set({ videoDuration: video.duration })
      video.src = ''
    }

    set({
      videoFile: file,
      videoUrl,
      playerData: null,
      error: null,
      convertProgress: 0,
    })
  },

  setColumns: (n) => set({ columns: n }),
  setCharacterSet: (cs) => set({ characterSet: cs }),
  setColorMode: (cm) => set({ colorMode: cm }),
  setFps: (fps) => set({ fps }),
  setIsConverting: (v) => set({ isConverting: v }),
  setConvertProgress: (p) => set({ convertProgress: p }),
  setError: (e) => set({ error: e }),
  setPlayerData: (d) => set({ playerData: d }),
  setRenderMode: (m) => set({ renderMode: m }),
  setTheme: (t) => set({ theme: t }),
  setLoop: (l) => set({ loop: l }),
  setCharDelay: (d) => set({ charDelay: d }),

  reset: () => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ ...defaults })
  },
}))
