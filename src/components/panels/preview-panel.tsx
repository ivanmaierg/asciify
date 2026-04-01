'use client'

import { useEditorStore } from '@/stores/editor-store'
import { VideoDropZone } from '@/components/preview/video-drop-zone'
import { AsciiCanvas } from '@/components/preview/ascii-canvas'
import { PlaybackBar } from '@/components/preview/playback-bar'
import { CrtOverlay } from '@/components/preview/crt-overlay'

export function PreviewPanel() {
  const playbackState = useEditorStore((s) => s.playbackState)
  const crtEnabled = useEditorStore((s) => s.crtEnabled)
  const crtRoundedCorners = useEditorStore((s) => s.crtRoundedCorners)

  if (playbackState === 'empty') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <VideoDropZone />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-black">
        <div
          className="relative inline-block"
          style={{
            borderRadius: crtEnabled ? `${crtRoundedCorners}px` : undefined,
            overflow: crtEnabled ? 'hidden' : undefined,
          }}
        >
          <AsciiCanvas />
          <CrtOverlay />
        </div>
      </div>
      <PlaybackBar />
    </div>
  )
}
