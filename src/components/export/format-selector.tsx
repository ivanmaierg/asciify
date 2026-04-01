'use client'

import { useEditorStore } from '@/stores/editor-store'
import { EXPORT_FORMAT_LABELS } from '@/lib/constants'
import type { ExportFormat } from '@/lib/constants'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function FormatSelector() {
  const format = useEditorStore((s) => s.exportFormat)
  const setFormat = useEditorStore((s) => s.setExportFormat)

  return (
    <Tabs value={format} onValueChange={(v: ExportFormat) => setFormat(v)}>
      <TabsList className="w-full">
        {(Object.entries(EXPORT_FORMAT_LABELS) as [ExportFormat, string][]).map(
          ([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ),
        )}
      </TabsList>
    </Tabs>
  )
}
