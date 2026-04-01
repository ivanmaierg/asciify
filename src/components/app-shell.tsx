'use client'

import { InputControls } from '@/components/panels/input-controls'
import { PreviewPanel } from '@/components/panels/preview-panel'
import { OutputPanel } from '@/components/panels/output-panel'

export function AppShell() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar — Input Controls */}
      <aside className="w-72 shrink-0 border-r border-border overflow-y-auto bg-background p-4">
        <InputControls />
      </aside>

      {/* Center — Preview */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PreviewPanel />
      </main>

      {/* Right sidebar — Output Controls */}
      <aside className="w-72 shrink-0 border-l border-border overflow-y-auto bg-background p-4">
        <OutputPanel />
      </aside>
    </div>
  )
}
