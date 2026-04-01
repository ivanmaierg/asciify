import { create } from 'zustand'
import {
  type CharacterSetName,
  type ColorMode,
  type ExportFormat,
  type ExportLoop,
  type PlaybackState,
  DEFAULT_SETTINGS,
} from '@/lib/constants'
import type { BitDepth, AudioSampleRate } from '@/lib/audio-processor'

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

  // Trim
  trimStart: number
  trimEnd: number

  // Audio
  audioEnabled: boolean
  audioBitDepth: BitDepth
  audioSampleRate: AudioSampleRate
  audioLowPass: number     // cutoff frequency Hz, 0 = off
  audioDistortion: number  // 0-100

  // CRT effects
  crtEnabled: boolean
  crtVignette: number
  crtRoundedCorners: number
  crtScanlines: number
  crtCurvature: number

  // Playback
  playbackState: PlaybackState
  currentTime: number

  // Export settings
  exportFormat: ExportFormat
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
  exportedOutput: string | null
  exportedBlob: Blob | null

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
  setTrimStart: (value: number) => void
  setTrimEnd: (value: number) => void
  setAudioEnabled: (value: boolean) => void
  setAudioBitDepth: (value: BitDepth) => void
  setAudioSampleRate: (value: AudioSampleRate) => void
  setAudioLowPass: (value: number) => void
  setAudioDistortion: (value: number) => void
  setCrtEnabled: (value: boolean) => void
  setCrtVignette: (value: number) => void
  setCrtRoundedCorners: (value: number) => void
  setCrtScanlines: (value: number) => void
  setCrtCurvature: (value: number) => void
  setPlaybackState: (state: PlaybackState) => void
  setCurrentTime: (time: number) => void
  setExportFormat: (value: ExportFormat) => void
  setExportFps: (value: number) => void
  setExportLoop: (value: ExportLoop) => void
  setExportAutoplay: (value: boolean) => void
  setExportCanvasWidth: (value: number) => void
  setExportShowControls: (value: boolean) => void
  setIsExporting: (value: boolean) => void
  setExportProgress: (value: number) => void
  setExportedOutput: (value: string | null) => void
  setExportedBlob: (value: Blob | null) => void
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

  // Trim
  trimStart: 0,
  trimEnd: 0,

  // Audio
  audioEnabled: true,
  audioBitDepth: 16 as BitDepth,
  audioSampleRate: 22050 as AudioSampleRate,
  audioLowPass: 4000,
  audioDistortion: 30,

  // CRT effects
  crtEnabled: false,
  crtVignette: 50,
  crtRoundedCorners: 20,
  crtScanlines: 30,
  crtCurvature: 30,

  // Playback
  playbackState: 'empty',
  currentTime: 0,

  // Export settings
  exportFormat: 'html' as ExportFormat,
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
  exportedOutput: null,
  exportedBlob: null,

  // Actions
  setVideoFile: (file) => {
    const prev = get().videoUrl
    if (prev) URL.revokeObjectURL(prev)
    const videoUrl = URL.createObjectURL(file)
    set({ videoFile: file, videoUrl, playbackState: 'loading', exportedOutput: null, exportedBlob: null })
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
      exportedOutput: null,
      exportedBlob: null,
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
  setTrimStart: (value) => set((s) => ({ trimStart: Math.min(value, s.trimEnd - 0.5) })),
  setTrimEnd: (value) => set((s) => ({ trimEnd: Math.max(value, s.trimStart + 0.5) })),
  setAudioEnabled: (value) => set({ audioEnabled: value }),
  setAudioBitDepth: (value) => set({ audioBitDepth: value }),
  setAudioSampleRate: (value) => set({ audioSampleRate: value }),
  setAudioLowPass: (value) => set({ audioLowPass: value }),
  setAudioDistortion: (value) => set({ audioDistortion: value }),
  setCrtEnabled: (value) => set({ crtEnabled: value }),
  setCrtVignette: (value) => set({ crtVignette: value }),
  setCrtRoundedCorners: (value) => set({ crtRoundedCorners: value }),
  setCrtScanlines: (value) => set({ crtScanlines: value }),
  setCrtCurvature: (value) => set({ crtCurvature: value }),
  setPlaybackState: (state) => set({ playbackState: state }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setExportFormat: (value) => set({ exportFormat: value, exportedOutput: null, exportedBlob: null }),
  setExportFps: (value) => set({ exportFps: value }),
  setExportLoop: (value) => set({ exportLoop: value }),
  setExportAutoplay: (value) => set({ exportAutoplay: value }),
  setExportCanvasWidth: (value) => set({ exportCanvasWidth: value }),
  setExportShowControls: (value) => set({ exportShowControls: value }),
  setIsExporting: (value) => set({ isExporting: value }),
  setExportProgress: (value) => set({ exportProgress: value }),
  setExportedOutput: (value) => set({ exportedOutput: value }),
  setExportedBlob: (value) => set({ exportedBlob: value }),
}))
