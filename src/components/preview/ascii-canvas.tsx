'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { convertFrameToAscii } from '@/lib/ascii-engine'
import { renderAsciiToCanvas } from '@/lib/pretext-renderer'
import { measureMonospaceChar } from '@/lib/measure-char'
import { WebGPURenderer } from '@/lib/webgpu-renderer'
import { connectAudioPreview, disconnectAudioPreview, destroyAudioPreview } from '@/lib/audio-preview'
import { CHARACTER_SETS } from '@/lib/constants'
import type { CharacterSetName } from '@/lib/constants'

function getCharset(name: CharacterSetName, custom: string): string {
  if (name === 'custom') return custom || CHARACTER_SETS.standard
  return CHARACTER_SETS[name]
}

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

export function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const extractionCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), value: 0 })
  const gpuRef = useRef<WebGPURenderer | null>(null)
  const [useWebGPU, setUseWebGPU] = useState(false)

  const store = useEditorStore()

  // Check WebGPU availability
  useEffect(() => {
    WebGPURenderer.isAvailable().then(setUseWebGPU)
  }, [])

  // Create video element and load source
  useEffect(() => {
    if (!store.videoUrl) return

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.playsInline = true
    video.muted = !useEditorStore.getState().audioEnabled
    video.src = store.videoUrl

    video.addEventListener('loadedmetadata', () => {
      useEditorStore.setState({
        videoDuration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        trimStart: 0,
        trimEnd: video.duration,
        playbackState: 'paused',
      })
    })

    videoRef.current = video

    const extractionCanvas = document.createElement('canvas')
    extractionCanvasRef.current = extractionCanvas

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [store.videoUrl])

  // Sync extraction canvas size
  useEffect(() => {
    const ec = extractionCanvasRef.current
    if (!ec || !store.videoWidth) return
    const MAX_SOURCE_WIDTH = 720
    const scale = Math.min(1, MAX_SOURCE_WIDTH / store.videoWidth)
    ec.width = Math.round(store.videoWidth * scale)
    ec.height = Math.round(store.videoHeight * scale)
  }, [store.videoWidth, store.videoHeight])

  // Sync audio: connect/disconnect with filters
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (store.audioEnabled) {
      connectAudioPreview(video, {
        bitDepth: store.audioBitDepth,
        sampleRate: store.audioSampleRate,
        lowPass: store.audioLowPass,
        distortion: store.audioDistortion,
      }).catch(() => {
        video.muted = false
      })
    } else {
      disconnectAudioPreview()
    }
  }, [store.audioEnabled, store.audioBitDepth, store.audioSampleRate, store.audioLowPass, store.audioDistortion])

  // Clean up audio on unmount only
  useEffect(() => {
    return () => { destroyAudioPreview() }
  }, [])

  // Init/recreate WebGPU renderer when charset/font changes
  useEffect(() => {
    if (!useWebGPU || !canvasRef.current || !store.videoWidth) return

    const s = useEditorStore.getState()
    const charset = getCharset(s.characterSet, s.customCharacters)
    const colorModeNum = s.colorMode === 'colored' ? 1 : s.colorMode === 'inverted' ? 2 : s.colorMode === 'monoscale' ? 3 : 0

    // Estimate rows from video aspect ratio
    const aspectRatio = store.videoWidth / store.videoHeight
    const rows = Math.max(1, Math.round((s.columns / aspectRatio) * 0.5))

    gpuRef.current?.destroy()
    gpuRef.current = null

    WebGPURenderer.create({
      canvas: canvasRef.current,
      gridColumns: s.columns,
      gridRows: rows,
      charset,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      bgColor: hexToRgb01(s.backgroundColor),
      fgColor: hexToRgb01(s.foregroundColor),
      colorMode: colorModeNum,
    })
      .then((renderer) => {
        gpuRef.current = renderer
      })
      .catch(() => {
        // Fallback to Canvas2D silently
        setUseWebGPU(false)
      })

    return () => {
      gpuRef.current?.destroy()
      gpuRef.current = null
    }
  }, [
    useWebGPU,
    store.characterSet,
    store.customCharacters,
    store.fontFamily,
    store.fontSize,
    store.columns,
    store.videoWidth,
    store.videoHeight,
  ])

  // Update WebGPU uniforms when colors change
  useEffect(() => {
    if (!gpuRef.current) return
    const s = useEditorStore.getState()
    const colorModeNum = s.colorMode === 'colored' ? 1 : s.colorMode === 'inverted' ? 2 : s.colorMode === 'monoscale' ? 3 : 0
    gpuRef.current.updateColors(
      hexToRgb01(s.backgroundColor),
      hexToRgb01(s.foregroundColor),
      colorModeNum,
    )
  }, [store.foregroundColor, store.backgroundColor, store.colorMode])

  // Render loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current
    const extractionCanvas = extractionCanvasRef.current
    const displayCanvas = canvasRef.current
    if (!video || !extractionCanvas || !displayCanvas) return
    if (video.readyState < 2) return

    const ectx = extractionCanvas.getContext('2d', { willReadFrequently: true })
    if (!ectx) return

    ectx.drawImage(video, 0, 0, extractionCanvas.width, extractionCanvas.height)
    const imageData = ectx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height)

    const s = useEditorStore.getState()
    const charset = getCharset(s.characterSet, s.customCharacters)

    const result = convertFrameToAscii(
      imageData,
      s.columns,
      charset,
      s.brightnessThreshold,
      s.contrastBoost,
      s.colorMode,
      s.gamma,
      s.edgeDetection,
      s.ditherMode,
      s.invertCharset,
    )

    // Try WebGPU first, fall back to Canvas2D
    if (gpuRef.current) {
      gpuRef.current.updateFrame(result.cells)
      gpuRef.current.render()
    } else {
      const font = `${s.fontSize}px ${s.fontFamily}, monospace`
      const { charWidth, charHeight: lineHeight } = measureMonospaceChar(font, s.fontSize)
      const rows = result.cells.length
      const canvasHeight = rows * lineHeight
      const canvasWidth = Math.ceil(charWidth * s.columns)

      const dctx = displayCanvas.getContext('2d')
      if (!dctx) return

      if (displayCanvas.width !== canvasWidth || displayCanvas.height !== canvasHeight) {
        displayCanvas.width = canvasWidth
        displayCanvas.height = canvasHeight
      }

      renderAsciiToCanvas(
        dctx,
        result.text,
        result.cells,
        font,
        s.fontSize,
        lineHeight,
        canvasWidth,
        canvasHeight,
        s.colorMode === 'colored' || s.colorMode === 'monoscale' ? undefined : s.foregroundColor,
        s.backgroundColor,
        s.colorMode,
      )
    }

    // Loop within trim bounds
    const { trimStart, trimEnd } = s
    if (video.currentTime >= trimEnd) {
      video.currentTime = trimStart
    }

    useEditorStore.setState({ currentTime: video.currentTime })

    fpsRef.current.frames++
    const now = performance.now()
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.value = fpsRef.current.frames
      fpsRef.current.frames = 0
      fpsRef.current.lastTime = now
    }
  }, [])

  // Playback loop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (store.playbackState === 'playing') {
      video.play().catch(() => {})
      const tick = () => {
        renderFrame()
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    } else if (store.playbackState === 'paused') {
      video.pause()
      renderFrame()
    }
  }, [store.playbackState, renderFrame])

  // Re-render on settings changes while paused
  useEffect(() => {
    if (store.playbackState === 'paused') {
      renderFrame()
    }
  }, [
    store.columns,
    store.characterSet,
    store.customCharacters,
    store.brightnessThreshold,
    store.contrastBoost,
    store.colorMode,
    store.gamma,
    store.edgeDetection,
    store.ditherMode,
    store.invertCharset,
    store.foregroundColor,
    store.backgroundColor,
    store.fontFamily,
    store.fontSize,
    store.playbackState,
    renderFrame,
  ])

  // Handle seeking
  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = time
      if (store.playbackState === 'paused') {
        video.addEventListener('seeked', () => renderFrame(), { once: true })
      }
    },
    [store.playbackState, renderFrame],
  )

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__asciiSeekTo = seekTo
    return () => {
      delete (window as unknown as Record<string, unknown>).__asciiSeekTo
    }
  }, [seekTo])

  return (
    <canvas
      ref={canvasRef}
      data-slot="ascii-preview"
      className="max-w-full max-h-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
