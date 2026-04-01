'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { convertFrameToAscii } from '@/lib/ascii-engine'
import { renderAsciiToCanvas } from '@/lib/pretext-renderer'
import { CHARACTER_SETS } from '@/lib/constants'
import type { CharacterSetName } from '@/lib/constants'

function getCharset(name: CharacterSetName, custom: string): string {
  if (name === 'custom') return custom || CHARACTER_SETS.standard
  return CHARACTER_SETS[name]
}

export function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const extractionCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), value: 0 })

  const store = useEditorStore()

  // Create video element and load source
  useEffect(() => {
    if (!store.videoUrl) return

    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.playsInline = true
    video.muted = true
    video.src = store.videoUrl

    video.addEventListener('loadedmetadata', () => {
      useEditorStore.setState({
        videoDuration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        playbackState: 'paused',
      })
    })

    videoRef.current = video

    // Create extraction canvas matching video dimensions
    const extractionCanvas = document.createElement('canvas')
    extractionCanvasRef.current = extractionCanvas

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [store.videoUrl])

  // Sync extraction canvas size to video dimensions
  useEffect(() => {
    const ec = extractionCanvasRef.current
    if (!ec || !store.videoWidth) return
    ec.width = store.videoWidth
    ec.height = store.videoHeight
  }, [store.videoWidth, store.videoHeight])

  // Render loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current
    const extractionCanvas = extractionCanvasRef.current
    const displayCanvas = canvasRef.current
    if (!video || !extractionCanvas || !displayCanvas) return
    if (video.readyState < 2) return

    const ectx = extractionCanvas.getContext('2d', { willReadFrequently: true })
    if (!ectx) return

    // Draw current video frame to extraction canvas
    ectx.drawImage(video, 0, 0, extractionCanvas.width, extractionCanvas.height)
    const imageData = ectx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height)

    // Get current settings from store
    const s = useEditorStore.getState()
    const charset = getCharset(s.characterSet, s.customCharacters)

    // Convert to ASCII
    const result = convertFrameToAscii(
      imageData,
      s.columns,
      charset,
      s.brightnessThreshold,
      s.contrastBoost,
      s.colorMode,
    )

    // Calculate canvas dimensions
    const lineHeight = Math.ceil(s.fontSize * 1.2)
    const rows = result.cells.length
    const canvasHeight = rows * lineHeight
    const font = `${s.fontSize}px ${s.fontFamily}, monospace`

    // Measure a character to determine canvas width
    const dctx = displayCanvas.getContext('2d')
    if (!dctx) return
    dctx.font = font
    const charWidth = dctx.measureText('M').width
    const canvasWidth = Math.ceil(charWidth * s.columns)

    // Size the display canvas
    if (displayCanvas.width !== canvasWidth || displayCanvas.height !== canvasHeight) {
      displayCanvas.width = canvasWidth
      displayCanvas.height = canvasHeight
    }

    // Render ASCII to display canvas
    renderAsciiToCanvas(
      dctx,
      result.text,
      result.cells,
      font,
      lineHeight,
      canvasWidth,
      canvasHeight,
      s.colorMode === 'colored' ? undefined : s.foregroundColor,
      s.backgroundColor,
      s.colorMode,
    )

    // Update current time
    useEditorStore.setState({ currentTime: video.currentTime })

    // FPS counter
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
      // Render one frame when paused (for settings changes)
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

  // Expose seekTo on the video element via a ref callback pattern
  useEffect(() => {
    // Store seekTo on window for PlaybackBar to access
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
