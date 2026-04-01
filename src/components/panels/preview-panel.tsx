'use client'

import { useEditorStore } from '@/stores/editor-store'
import { VideoDropZone } from '@/components/preview/video-drop-zone'
import { AsciiCanvas } from '@/components/preview/ascii-canvas'
import { PlaybackBar } from '@/components/preview/playback-bar'

export function PreviewPanel() {
  const playbackState = useEditorStore((s) => s.playbackState)

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
        <AsciiCanvas />
      </div>
      <PlaybackBar />
    </div>
  )
}
