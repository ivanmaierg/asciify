'use client'

import { useEditorStore } from '@/stores/editor-store'
import { FormatSelector } from '@/components/export/format-selector'
import { ExportSettings } from '@/components/export/export-settings'
import { ExportButton } from '@/components/export/export-button'
import { CodePreview } from '@/components/export/code-preview'
import { Separator } from '@/components/ui/separator'

export function OutputPanel() {
  const exportedOutput = useEditorStore((s) => s.exportedOutput)
  const exportedBlob = useEditorStore((s) => s.exportedBlob)

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Export</h2>
      <FormatSelector />
      <Separator />
      <ExportSettings />
      <Separator />
      <ExportButton />
      {(exportedOutput || exportedBlob) && (
        <>
          <Separator />
          <CodePreview />
        </>
      )}
    </div>
  )
}
