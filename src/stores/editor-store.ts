import { create } from 'zustand'
import {
  type CharacterSetName,
  type ColorMode,
  type ExportLoop,
  type PlaybackState,
  DEFAULT_SETTINGS,
} from '@/lib/constants'

interface EditorState {
  // Video source
  videoFile: File | null
  videoUrl: string | null
  videoDuration: number
  videoWidth: number
  videoHeight: number
  frameRate: number

  // Conversion settings
  characterSet: CharacterSetName
  customCharacters: string
  columns: number
  brightnessThreshold: number
  contrastBoost: number
  colorMode: ColorMode
  foregroundColor: string
  backgroundColor: string
  fontFamily: string
  fontSize: number
  frameSkip: number

  // Playback
  playbackState: PlaybackState
  currentTime: number

  // Export settings
  exportFps: number
  exportLoop: ExportLoop
  exportAutoplay: boolean
  exportCanvasWidth: number
  exportFgColor: string
  exportBgColor: string
  exportShowControls: boolean

  // Export state
  isExporting: boolean
  exportProgress: number
  exportedHtml: string | null

  // Actions
  setVideoFile: (file: File) => void
  clearVideo: () => void
  setCharacterSet: (value: CharacterSetName) => void
  setCustomCharacters: (value: string) => void
  setColumns: (value: number) => void
  setBrightnessThreshold: (value: number) => void
  setContrastBoost: (value: number) => void
  setColorMode: (value: ColorMode) => void
  setForegroundColor: (value: string) => void
  setBackgroundColor: (value: string) => void
  setFontFamily: (value: string) => void
  setFontSize: (value: number) => void
  setFrameSkip: (value: number) => void
  setPlaybackState: (state: PlaybackState) => void
  setCurrentTime: (time: number) => void
  setExportFps: (value: number) => void
  setExportLoop: (value: ExportLoop) => void
  setExportAutoplay: (value: boolean) => void
  setExportCanvasWidth: (value: number) => void
  setExportShowControls: (value: boolean) => void
  setIsExporting: (value: boolean) => void
  setExportProgress: (value: number) => void
  setExportedHtml: (value: string | null) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Video source
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  videoWidth: 0,
  videoHeight: 0,
  frameRate: 30,

  // Conversion settings
  characterSet: DEFAULT_SETTINGS.characterSet,
  customCharacters: DEFAULT_SETTINGS.customCharacters,
  columns: DEFAULT_SETTINGS.columns,
  brightnessThreshold: DEFAULT_SETTINGS.brightnessThreshold,
  contrastBoost: DEFAULT_SETTINGS.contrastBoost,
  colorMode: DEFAULT_SETTINGS.colorMode,
  foregroundColor: DEFAULT_SETTINGS.foregroundColor,
  backgroundColor: DEFAULT_SETTINGS.backgroundColor,
  fontFamily: DEFAULT_SETTINGS.fontFamily,
  fontSize: DEFAULT_SETTINGS.fontSize,
  frameSkip: DEFAULT_SETTINGS.frameSkip,

  // Playback
  playbackState: 'empty',
  currentTime: 0,

  // Export settings
  exportFps: DEFAULT_SETTINGS.exportFps,
  exportLoop: DEFAULT_SETTINGS.exportLoop,
  exportAutoplay: DEFAULT_SETTINGS.exportAutoplay,
  exportCanvasWidth: DEFAULT_SETTINGS.exportCanvasWidth,
  exportFgColor: DEFAULT_SETTINGS.foregroundColor,
  exportBgColor: DEFAULT_SETTINGS.backgroundColor,
  exportShowControls: DEFAULT_SETTINGS.exportShowControls,

  // Export state
  isExporting: false,
  exportProgress: 0,
  exportedHtml: null,

  // Actions
  setVideoFile: (file) => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    const videoUrl = URL.createObjectURL(file)
    set({ videoFile: file, videoUrl, playbackState: 'loading', exportedHtml: null })
  },

  clearVideo: () => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      videoFile: null,
      videoUrl: null,
      videoDuration: 0,
      videoWidth: 0,
      videoHeight: 0,
      playbackState: 'empty',
      currentTime: 0,
      exportedHtml: null,
    })
  },

  setCharacterSet: (value) => set({ characterSet: value }),
  setCustomCharacters: (value) => set({ customCharacters: value }),
  setColumns: (value) => set({ columns: value }),
  setBrightnessThreshold: (value) => set({ brightnessThreshold: value }),
  setContrastBoost: (value) => set({ contrastBoost: value }),
  setColorMode: (value) => set({ colorMode: value }),
  setForegroundColor: (value) => set({ foregroundColor: value }),
  setBackgroundColor: (value) => set({ backgroundColor: value }),
  setFontFamily: (value) => set({ fontFamily: value }),
  setFontSize: (value) => set({ fontSize: value }),
  setFrameSkip: (value) => set({ frameSkip: value }),
  setPlaybackState: (state) => set({ playbackState: state }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setExportFps: (value) => set({ exportFps: value }),
  setExportLoop: (value) => set({ exportLoop: value }),
  setExportAutoplay: (value) => set({ exportAutoplay: value }),
  setExportCanvasWidth: (value) => set({ exportCanvasWidth: value }),
  setExportShowControls: (value) => set({ exportShowControls: value }),
  setIsExporting: (value) => set({ isExporting: value }),
  setExportProgress: (value) => set({ exportProgress: value }),
  setExportedHtml: (value) => set({ exportedHtml: value }),
}))
