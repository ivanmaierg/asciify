'use client'

import { useEditorStore } from '@/stores/editor-store'
import { ExportSettings } from '@/components/export/export-settings'
import { ExportButton } from '@/components/export/export-button'
import { CodePreview } from '@/components/export/code-preview'
import { Separator } from '@/components/ui/separator'

export function OutputPanel() {
  const exportedHtml = useEditorStore((s) => s.exportedHtml)

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Export — HTML</h2>
      <Separator />
      <ExportSettings />
      <Separator />
      <ExportButton />
      {exportedHtml && (
        <>
          <Separator />
          <CodePreview />
        </>
      )}
    </div>
  )
}
