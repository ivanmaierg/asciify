'use client'

import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, RotateCcw, ExternalLink } from 'lucide-react'

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PlaybackBar() {
  const playbackState = useEditorStore((s) => s.playbackState)
  const currentTime = useEditorStore((s) => s.currentTime)
  const duration = useEditorStore((s) => s.videoDuration)
  const setPlaybackState = useEditorStore((s) => s.setPlaybackState)
  const clearVideo = useEditorStore((s) => s.clearVideo)

  const togglePlay = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused')
    } else {
      setPlaybackState('playing')
    }
  }

  const handleSeek = (v: number | readonly number[]) => {
    const value = sliderVal(v)
    const seekTo = (window as unknown as Record<string, (t: number) => void>).__asciiSeekTo
    if (seekTo) seekTo(value)
    useEditorStore.setState({ currentTime: value })
  }

  return (
    <div className="flex items-center gap-3 border-t border-border bg-background px-4 py-2">
      <Button variant="ghost" size="icon-sm" onClick={togglePlay}>
        {playbackState === 'playing' ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <span className="text-xs text-muted-foreground tabular-nums w-20">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <Slider
        className="flex-1"
        min={0}
        max={duration || 1}
        step={0.01}
        value={[currentTime]}
        onValueChange={handleSeek}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          const canvas = document.querySelector('canvas[data-slot="ascii-preview"]') as HTMLCanvasElement | null
          if (!canvas) return
          const dataUrl = canvas.toDataURL('image/png')
          const w = window.open('', '_blank')
          if (!w) return
          const { backgroundColor } = useEditorStore.getState()
          w.document.write(`<!DOCTYPE html><html><head><title>ASCIIfy Preview</title><style>*{margin:0;padding:0}body{background:${backgroundColor};display:flex;align-items:center;justify-content:center;min-height:100vh}</style></head><body><img src="${dataUrl}" style="max-width:100%;height:auto"></body></html>`)
          w.document.close()
        }}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon-sm" onClick={clearVideo}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}
