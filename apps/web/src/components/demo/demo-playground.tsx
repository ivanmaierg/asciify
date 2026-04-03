'use client'

import { useDemoStore } from '@/stores/demo-store'
import { DemoDropZone } from './demo-drop-zone'

export function DemoPlayground() {
  const videoUrl = useDemoStore((s) => s.videoUrl)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Asciify Playground</h1>
          <p className="text-muted-foreground mt-2">
            Drop a video, tweak settings, watch it play as ASCII art
          </p>
        </div>

        {!videoUrl ? (
          <DemoDropZone />
        ) : (
          <div className="flex gap-6">
            {/* Controls panel */}
            <div className="w-full max-w-sm shrink-0">
              {/* Settings and converter rendered here by Task 2 */}
            </div>

            {/* Player area */}
            <div className="flex-1 rounded-xl border border-muted-foreground/25 bg-muted/10 flex items-center justify-center min-h-[400px]">
              <p className="text-muted-foreground text-sm">
                Player output will appear here after conversion
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
