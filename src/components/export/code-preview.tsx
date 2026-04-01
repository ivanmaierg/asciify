'use client'

import { useState, useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink } from 'lucide-react'

export function CodePreview() {
  const exportedHtml = useEditorStore((s) => s.exportedHtml)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!exportedHtml) return
    await navigator.clipboard.writeText(exportedHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [exportedHtml])

  if (!exportedHtml) return null

  // Create a truncated preview — show structure but not full frame data
  const preview = createPreview(exportedHtml)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Output Preview</span>
        <div className="flex gap-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            if (!exportedHtml) return
            const blob = new Blob([exportedHtml], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Preview
        </Button>
        <Button variant="ghost" size="xs" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground leading-relaxed">
        {preview}
      </pre>
      <p className="text-xs text-muted-foreground">
        {(new Blob([exportedHtml]).size / 1024).toFixed(1)} KB
      </p>
    </div>
  )
}

function createPreview(html: string): string {
  // Show the HTML structure but truncate the frame data array
  const frameMatch = html.match(new RegExp('var F=\\[.*?\\];', 's'))
  if (!frameMatch) return html.slice(0, 1000) + '\n...'

  const before = html.slice(0, frameMatch.index!)
  const after = html.slice(frameMatch.index! + frameMatch[0].length)

  // Count frames
  const frameCount = (frameMatch[0].match(/","/g)?.length ?? 0) + 1

  return before + `var F=[/* ${frameCount} frames */];` + after
}
